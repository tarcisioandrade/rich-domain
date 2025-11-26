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
 *
 * @example
 * ```typescript
 * // Getting changes from the aggregate
 * const changes = user.getChanges();
 *
 * // Checking if there are changes
 * if (changes.isEmpty()) return;
 *
 * // Getting batch operations for persistence
 * const batch = changes.toBatchOperations();
 *
 * // Iterating in the correct order
 * for (const op of changes.operations()) {
 *   console.log(op.type, op.entity, op.depth);
 * }
 *
 * // Filtering by entity
 * const postChanges = changes.for('Post');
 * if (postChanges.hasCreates()) {
 *   // ...
 * }
 * ```
 */
export class AggregateChanges<TProps = any> {
  private ops: Operation[] = [];

  constructor(operations: Operation[] = []) {
    this.ops = [...operations];
  }

  /**
   * Adds a create operation.
   */
  addCreate<T>(
    entity: string,
    data: T,
    depth: number,
    parentId?: string,
    parentEntity?: string
  ): void {
    this.ops.push({
      type: "create",
      entity,
      data,
      depth,
      parentId,
      parentEntity,
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
   */
  addDelete<T>(entity: string, id: string, data: T, depth: number): void {
    this.ops.push({
      type: "delete",
      entity,
      id,
      data,
      depth,
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
   * - Deletes: depth DESC (leaf → root)
   * - Creates: depth ASC (root → leaf)
   * - Updates: grouped by entity
   *
   * @example
   * ```typescript
   * const batch = changes.toBatchOperations();
   *
   * // Run deletes
   * for (const del of batch.deletes) {
   *   await tx[del.entity].deleteMany({ where: { id: { in: del.ids } } });
   * }
   *
   * // Run creates
   * for (const create of batch.creates) {
   *   await tx[create.entity].createMany({ data: create.items });
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
   * Groups deletes by entity, sorted by descending depth.
   */
  private groupDeletes(): BatchOperations["deletes"] {
    const deleteOps = this.deletes();
    const grouped = new Map<string, { depth: number; ids: string[] }>();

    for (const op of deleteOps) {
      if (!grouped.has(op.entity)) {
        grouped.set(op.entity, { depth: op.depth, ids: [] });
      }
      grouped.get(op.entity)!.ids.push(op.id);
    }

    return Array.from(grouped.entries())
      .map(([entity, { depth, ids }]) => ({ entity, depth, ids }))
      .sort((a, b) => b.depth - a.depth);
  }

  /**
   * Groups creates by entity, sorted by ascending depth.
   */
  private groupCreates(): BatchOperations["creates"] {
    const createOps = this.creates();
    const grouped = new Map<
      string,
      { depth: number; items: BatchCreateItem[] }
    >();

    for (const op of createOps) {
      if (!grouped.has(op.entity)) {
        grouped.set(op.entity, { depth: op.depth, items: [] });
      }
      grouped.get(op.entity)!.items.push({
        data: op.data,
        parentId: op.parentId,
      });
    }

    return Array.from(grouped.entries())
      .map(([entity, { depth, items }]) => ({ entity, depth, items }))
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
  for<T = any>(entityName: string): EntityChanges<T> {
    const filtered = this.ops.filter((op) => op.entity === entityName);
    return new EntityChanges<T>(filtered);
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
   * Clears all operations.
   */
  clear(): void {
    this.ops = [];
  }

  /**
   * Creates a copy of the changes.
   */
  clone(): AggregateChanges<TProps> {
    return new AggregateChanges<TProps>([...this.ops]);
  }
}
