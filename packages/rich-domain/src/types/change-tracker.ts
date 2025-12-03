import { Entity } from "../entity";
import { ValueObject } from "../value-object";

/**
 * Base operation with common information.
 */
export interface BaseOperation {
  /** Entity name in the domain (e.g., 'User', 'Post', 'Comment') */
  entity: string;
  /** Depth in the aggregate tree (0 = root, 1 = direct children, etc.) */
  depth: number;
  /** Name of the relation field in the parent entity (e.g., 'tags', 'comments') */
  relationField?: string;
}

/**
 * Create operation.
 */
export interface CreateOperation<T = any> extends BaseOperation {
  type: "create";
  /** Entity data to be created */
  data: T;
  /** Parent ID (for FK) */
  parentId?: string;
  /** Parent entity name */
  parentEntity?: string;
}

/**
 * Update operation.
 */
export interface UpdateOperation<T = any> extends BaseOperation {
  type: "update";
  /** Entity ID */
  id: string;
  /** Current entity instance */
  data: T;
  /** Only fields that have changed */
  changedFields: Record<string, any>;
}

/**
 * Delete operation.
 */
export interface DeleteOperation<T = any> extends BaseOperation {
  type: "delete";
  /** Entity ID to be deleted */
  id: string;
  /** Entity data (for reference) */
  data: T;
}

/**
 * Union of all possible operations.
 */
export type Operation<T = any> =
  | CreateOperation<T>
  | UpdateOperation<T>
  | DeleteOperation<T>;

/**
 * Item for batch creation.
 */
export interface BatchCreateItem<T = any> {
  /** Entity data */
  data: T;
  /** Parent ID (for FK) */
  parentId?: string;
  /** Relation field name */
  relationField?: string;
}

/**
 * Item for batch update.
 */
export interface BatchUpdateItem {
  /** Entity ID */
  id: string;
  /** Fields that have changed */
  changedFields: Record<string, any>;
}

/**
 * Item for batch delete.
 */
export interface BatchDeleteItem {
  /** Entity ID */
  id: string;
  /** Relation field name */
  relationField?: string;
}

/**
 * Grouped and ordered operations for batch execution.
 */
export interface BatchOperations {
  /**
   * Deletes grouped by entity, ordered by depth descending (leaf → root).
   */
  deletes: Array<{
    entity: string;
    depth: number;
    ids: string[];
    /** Relation field name (for determining owned vs reference) */
    relationField?: string;
    /** Individual items with their relation fields (when mixed) */
    items?: BatchDeleteItem[];
  }>;

  /**
   * Creates grouped by entity, ordered by depth ascending (root → leaf).
   */
  creates: Array<{
    entity: string;
    depth: number;
    items: BatchCreateItem[];
    /** Relation field name (for determining owned vs reference) */
    relationField?: string;
  }>;

  /**
   * Updates grouped by entity.
   */
  updates: Array<{
    entity: string;
    items: BatchUpdateItem[];
  }>;
}

/**
 * Changes detected in a collection (1:N).
 */
export interface CollectionChanges<T = any> {
  /** Created items */
  created: T[];
  /** Updated items with their changes */
  updated: Array<{
    entity: T;
    changes: Record<string, { from: any; to: any }>;
  }>;
  /** Deleted items */
  deleted: T[];
}

/**
 * Possible states for a 1:1 relationship.
 */
export type EntityChangeState =
  | "created" // null → Entity
  | "updated" // Entity(id:1) → Entity(id:1) with changes
  | "deleted" // Entity → null
  | "replaced" // Entity(id:1) → Entity(id:2)
  | "unchanged"; // No changes

/**
 * Change in a 1:1 entity relationship.
 */
export interface EntityChange<T = any> {
  /** State of the change */
  state: EntityChangeState;
  /** Current entity (null if deleted) */
  current: T | null;
  /** Previous entity (null if created) */
  previous: T | null;
  /** Field changes (if state === 'updated') */
  changes?: Record<string, { from: any; to: any }>;
}

/**
 * Change in a primitive field.
 */
export interface FieldChange<T = any> {
  from: T;
  to: T;
}

/**
 * Extracts the props type from an Entity or ValueObject.
 */
export type ExtractProps<T> = T extends Entity<infer P>
  ? P
  : T extends ValueObject<infer P>
  ? P
  : never;

/**
 * Keys of primitive properties (not Entity, ValueObject or Array).
 */
export type PrimitiveKeys<T> = {
  [K in keyof T]: T[K] extends
    | Entity<any>
    | ValueObject<any>
    | Array<any>
    | undefined
    ? never
    : K;
}[keyof T];

/**
 * Keys of collections (arrays).
 */
export type CollectionKeys<T> = {
  [K in keyof T]: T[K] extends Array<any> ? K : never;
}[keyof T];

/**
 * Keys of single entities (1:1).
 */
export type SingleEntityKeys<T> = {
  [K in keyof T]: T[K] extends Entity<any> | ValueObject<any> | null | undefined
    ? T[K] extends Array<any>
      ? never
      : K
    : never;
}[keyof T];

/**
 * Change history entry.
 */
export interface HistoryEntry {
  path: string;
  previousValue: any;
  currentValue: any;
  timestamp: number;
}

/**
 * Metadata from a tracked entity/VO.
 */
export interface TrackedEntityMetadata {
  /** Entity name */
  entityName: string;
  /** Depth in the tree */
  depth: number;
  /** Parent ID */
  parentId?: string;
  /** Parent entity name */
  parentEntity?: string;
  /** Path in the object (e.g., 'posts[0].comments[1]') */
  path: string;
}

export interface TrackedItem {
  entity: any;
  metadata: TrackedEntityMetadata;
  originalState: any;
}

export interface ArrayState {
  cloned: any[];
  original: any[];
  metadata: TrackedEntityMetadata;
}