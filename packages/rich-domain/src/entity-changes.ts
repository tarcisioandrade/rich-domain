import {
  Operation,
  CreateOperation,
  UpdateOperation,
  DeleteOperation,
} from "./types/change-tracker.js";

/**
 * Represents the changes filtered for a specific entity.
 *
 * @example
 * ```typescript
 * const changes = user.getChanges();
 * const postChanges = changes.for('Post');
 *
 * if (postChanges.hasCreates()) {
 *   console.log('Created posts:', postChanges.creates);
 * }
 *
 * if (postChanges.hasUpdates()) {
 *   postChanges.updates.forEach(({ entity, changed }) => {
 *     console.log(`Post ${entity.id} has changed:`, changed);
 *   });
 * }
 * ```
 */
export class EntityChanges<T = any> {
  constructor(private readonly operations: Operation<T>[]) {}

  /**
   * Returns all created entities
   */
  get creates(): T[] {
    return this.operations
      .filter((op): op is CreateOperation<T> => op.type === "create")
      .map((op) => op.data);
  }

  /**
   * Returns all updated entities with their changed fields
   */
  get updates(): Array<{ entity: T; changed: Record<string, any> }> {
    return this.operations
      .filter((op): op is UpdateOperation<T> => op.type === "update")
      .map((op) => ({
        entity: op.data,
        changed: op.changedFields,
      }));
  }

  /**
   * Returns all deleted entities
   */
  get deletes(): T[] {
    return this.operations
      .filter((op): op is DeleteOperation<T> => op.type === "delete")
      .map((op) => op.data);
  }

  /**
   * Returns the IDs of the created entities
   */
  get createIds(): string[] {
    return this.operations
      .filter((op): op is CreateOperation<T> => op.type === "create")
      .map((op) => this.extractId(op.data))
      .filter((id): id is string => id !== undefined);
  }

  /**
   * Returns the IDs of the updated entities
   */
  get updateIds(): string[] {
    return this.operations
      .filter((op): op is UpdateOperation<T> => op.type === "update")
      .map((op) => op.id);
  }

  /**
   * Returns the IDs of the deleted entities
   */
  get deleteIds(): string[] {
    return this.operations
      .filter((op): op is DeleteOperation<T> => op.type === "delete")
      .map((op) => op.id);
  }

  /**
   * Checks if there are any creates
   */
  hasCreates(): boolean {
    return this.creates.length > 0;
  }

  /**
   * Checks if there are any updates
   */
  hasUpdates(): boolean {
    return this.updates.length > 0;
  }

  /**
   * Checks if there are any deletes
   */
  hasDeletes(): boolean {
    return this.deletes.length > 0;
  }

  /**
   * Checks if there is any change
   */
  hasChanges(): boolean {
    return this.operations.length > 0;
  }

  /**
   * Checks if it is empty (no changes)
   */
  isEmpty(): boolean {
    return this.operations.length === 0;
  }

  /**
   * Returns the total number of operations
   */
  get count(): number {
    return this.operations.length;
  }

  /**
   * Returns the raw operations (for advanced use cases)
   */
  get rawOperations(): Operation<T>[] {
    return [...this.operations];
  }

  /**
   * Extracts the ID from an entity
   */
  private extractId(entity: any): string | undefined {
    if (!entity) return undefined;
    if (entity.id?.value) return entity.id.value;
    if (typeof entity.id === "string") return entity.id;
    return undefined;
  }
}