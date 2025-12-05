import {
  Operation,
  CreateOperation,
  UpdateOperation,
  DeleteOperation,
  BatchOperations,
  BatchCreateItem,
  BatchUpdateItem,
} from "./types/change-tracker";
import { EntityChanges } from "./entity-changes";

/**
 * Manages and organizes the changes of an Aggregate.
 *
 * Responsibilities:
 * - Stores all operations (create, update, delete)
 * - Orders operations respecting FK dependencies
 * - Groups operations by entity for batch execution
 * - Provides query and iteration methods
 * - Includes relationField, parentId, parentEntity for N:N support
 *
 * @example
 * ```typescript
 * // Define an entity map for type-safe operations
 * type UserEntities = {
 *   User: User;
 *   Post: Post;
 *   Comment: Comment;
 * };
 *
 * // Getting changes with types
 * const changes = user.getChanges<UserEntities>();
 *
 * // Filtering by entity with autocompletion
 * const postChanges = changes.for('Post');
 * postChanges.creates.forEach(post => {
 *   console.log(post.title);
 * });
 * ```
 */
export class AggregateChanges<TEntityMap = Record<string, any>> {
  private ops: Operation[] = [];

  constructor(operations: Operation[] = []) {
    this.ops = [...operations];
  }

  /**
   * Adds a create operation.
   *
   * @param entity - Entity name
   * @param data - Entity data
   * @param depth - Depth in the aggregate tree
   * @param parentId - Parent entity ID (for FK)
   * @param parentEntity - Parent entity name
   * @param relationField - Name of the relation field in parent (e.g., 'tags', 'comments')
   */
  addCreate<T>(
    entity: string,
    data: T,
    depth: number,
    parentId?: string,
    parentEntity?: string,
    relationField?: string
  ): void {
    this.ops.push({
      type: "create",
      entity,
      data,
      depth,
      parentId,
      parentEntity,
      relationField,
    } as CreateOperation<T>);
  }

  /**
   * Adds an update operation.
   */
  addUpdate<T>(
    entity: string,
    id: string,
    data: T,
    changedFields: Record<string, any>,
    depth: number
  ): void {
    this.ops.push({
      type: "update",
      entity,
      id,
      data,
      changedFields,
      depth,
    } as UpdateOperation<T>);
  }

  /**
   * Adds a delete operation.
   *
   * @param entity - Entity name
   * @param id - Entity ID
   * @param data - Entity data (for reference)
   * @param depth - Depth in the aggregate tree
   * @param relationField - Name of the relation field in parent (e.g., 'tags', 'comments')
   * @param parentId - Parent entity ID (for N:N disconnect)
   * @param parentEntity - Parent entity name (for N:N disconnect)
   */
  addDelete<T>(
    entity: string,
    id: string,
    data: T,
    depth: number,
    relationField?: string,
    parentId?: string,
    parentEntity?: string
  ): void {
    this.ops.push({
      type: "delete",
      entity,
      id,
      data,
      depth,
      relationField,
      parentId,
      parentEntity,
    } as DeleteOperation<T>);
  }

  /**
   * Returns all create operations, sorted by ascending depth (root → leaf).
   */
  creates(): CreateOperation[] {
    return this.ops
      .filter((op): op is CreateOperation => op.type === "create")
      .sort((a, b) => a.depth - b.depth);
  }

  /**
   * Returns all update operations.
   */
  updates(): UpdateOperation[] {
    return this.ops.filter((op): op is UpdateOperation => op.type === "update");
  }

  /**
   * Returns all delete operations, sorted by descending depth (leaf → root).
   */
  deletes(): DeleteOperation[] {
    return this.ops
      .filter((op): op is DeleteOperation => op.type === "delete")
      .sort((a, b) => b.depth - a.depth);
  }

  /**
   * Iterator that returns operations in the correct execution order:
   * 1. Deletes (leaf → root)
   * 2. Creates (root → leaf)
   * 3. Updates
   */
  *operations(): Generator<Operation> {
    yield* this.deletes();
    yield* this.creates();
    yield* this.updates();
  }

  /**
   * Returns all operations as an array in execution order.
   */
  toArray(): Operation[] {
    return [...this.operations()];
  }

  /**
   * Converts the changes into BatchOperations for optimized execution.
   *
   * Groups operations by entity and sorts by depth:
   * - Deletes: depth DESC (leaf → root), grouped by entity + relationField + parentId
   * - Creates: depth ASC (root → leaf), grouped by entity + relationField
   * - Updates: grouped by entity
   *
   * @example
   * ```typescript
   * const batch = changes.toBatchOperations();
   *
   * // Run deletes
   * for (const del of batch.deletes) {
   *   if (registry.isReferenceCollection(del.parentEntity, del.relationField)) {
   *     // N:N - disconnect only
   *     await prisma[del.parentEntity].update({
   *       where: { id: del.parentId },
   *       data: { [del.relationField]: { disconnect: del.ids.map(id => ({ id })) } }
   *     });
   *   } else {
   *     // 1:N - delete entities
   *     await prisma[del.entity].deleteMany({ where: { id: { in: del.ids } } });
   *   }
   * }
   * ```
   */
  toBatchOperations(): BatchOperations {
    return {
      deletes: this.groupDeletes(),
      creates: this.groupCreates(),
      updates: this.groupUpdates(),
    };
  }

  /**
   * Groups deletes by entity + relationField + parentId, sorted by descending depth.
   *
   * For N:N relations, we need to group by parentId because disconnect
   * operations are performed on the parent entity.
   */
  private groupDeletes(): BatchOperations["deletes"] {
    const deleteOps = this.deletes();
    const grouped = new Map<
      string,
      {
        depth: number;
        ids: string[];
        relationField?: string;
        parentEntity?: string;
        parentId?: string;
      }
    >();

    for (const op of deleteOps) {
      // Group by entity + relationField + parentId
      // This ensures N:N disconnects are grouped per parent
      const key = `${op.entity}:${op.relationField ?? ""}:${op.parentId ?? ""}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          depth: op.depth,
          ids: [],
          relationField: op.relationField,
          parentEntity: op.parentEntity,
          parentId: op.parentId,
        });
      }
      grouped.get(key)!.ids.push(op.id);
    }

    return Array.from(grouped.entries())
      .map(([key, { depth, ids, relationField, parentEntity, parentId }]) => {
        const entity = key.split(":")[0];
        return { entity, depth, ids, parentId, relationField, parentEntity };
      })
      .sort((a, b) => b.depth - a.depth);
  }

  /**
   * Groups creates by entity + relationField, sorted by ascending depth.
   *
   * Preserves parentEntity for N:N connect operations.
   */
  private groupCreates(): BatchOperations["creates"] {
    const createOps = this.creates();
    const grouped = new Map<
      string,
      {
        depth: number;
        items: BatchCreateItem[];
        relationField?: string;
        parentEntity?: string;
      }
    >();

    for (const op of createOps) {
      const key = `${op.entity}:${op.relationField ?? ""}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          depth: op.depth,
          items: [],
          relationField: op.relationField,
          parentEntity: op.parentEntity,
        });
      }
      grouped.get(key)!.items.push({
        data: op.data,
        parentId: op.parentId,
        parentEntity: op.parentEntity,
        relationField: op.relationField,
      });
    }

    return Array.from(grouped.entries())
      .map(([key, { depth, items, relationField, parentEntity }]) => {
        const entity = key.split(":")[0];
        return { entity, depth, items, relationField, parentEntity };
      })
      .sort((a, b) => a.depth - b.depth);
  }

  /**
   * Groups updates by entity.
   */
  private groupUpdates(): BatchOperations["updates"] {
    const updateOps = this.updates();
    const grouped = new Map<string, BatchUpdateItem[]>();

    for (const op of updateOps) {
      if (!grouped.has(op.entity)) {
        grouped.set(op.entity, []);
      }
      grouped.get(op.entity)!.push({
        id: op.id,
        changedFields: op.changedFields,
      });
    }

    return Array.from(grouped.entries()).map(([entity, items]) => ({
      entity,
      items,
    }));
  }

  /**
   * Filters changes by entity name.
   *
   * @param entityName - Name of the entity (e.g., 'Post', 'Comment')
   * @returns EntityChanges containing only the operations for this entity
   *
   * @example
   * ```typescript
   * const postChanges = changes.for('Post');
   *
   * if (postChanges.hasCreates()) {
   *   postChanges.creates.forEach(post => {
   *     console.log('New post:', post.title);
   *   });
   * }
   * ```
   */
  for<K extends keyof TEntityMap>(entityName: K): EntityChanges<TEntityMap[K]> {
    const filtered = this.ops.filter((op) => op.entity === entityName);
    return new EntityChanges<TEntityMap[K]>(filtered);
  }

  /**
   * Filters changes by relation field.
   *
   * @param relationField - Name of the relation field (e.g., 'tags', 'comments')
   * @returns New AggregateChanges containing only operations for this relation
   *
   * @example
   * ```typescript
   * const tagChanges = changes.forRelation('tags');
   * // Contains only creates/deletes for the 'tags' relation
   * ```
   */
  forRelation(relationField: string): AggregateChanges<TEntityMap> {
    const filtered = this.ops.filter(
      (op) => op.relationField === relationField
    );
    return new AggregateChanges<TEntityMap>(filtered);
  }

  /**
   * Checks if there are create operations.
   */
  hasCreates(): boolean {
    return this.ops.some((op) => op.type === "create");
  }

  /**
   * Checks if there are update operations.
   */
  hasUpdates(): boolean {
    return this.ops.some((op) => op.type === "update");
  }

  /**
   * Checks if there are delete operations.
   */
  hasDeletes(): boolean {
    return this.ops.some((op) => op.type === "delete");
  }

  /**
   * Checks if there are any operations.
   */
  hasChanges(): boolean {
    return this.ops.length > 0;
  }

  /**
   * Checks if there are no operations.
   */
  isEmpty(): boolean {
    return this.ops.length === 0;
  }

  /**
   * Returns the total number of operations.
   */
  get count(): number {
    return this.ops.length;
  }

  /**
   * Returns the raw operations (for debug/testing).
   */
  get rawOperations(): Operation[] {
    return [...this.ops];
  }

  /**
   * Lists all entities that have changes.
   */
  getAffectedEntities(): string[] {
    const entities = new Set<string>();
    this.ops.forEach((op) => entities.add(op.entity));
    return Array.from(entities);
  }

  /**
   * Lists all relation fields that have changes.
   */
  getAffectedRelations(): string[] {
    const relations = new Set<string>();
    this.ops.forEach((op) => {
      if (op.relationField) {
        relations.add(op.relationField);
      }
    });
    return Array.from(relations);
  }

  /**
   * Clears all operations.
   */
  clear(): void {
    this.ops = [];
  }

  /**
   * Creates a copy of the changes.
   */
  clone(): AggregateChanges<TEntityMap> {
    return new AggregateChanges<TEntityMap>([...this.ops]);
  }
}
