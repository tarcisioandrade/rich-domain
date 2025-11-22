// ============================================================================
// Entity & Aggregate Classes
// ============================================================================

import { BaseEntity } from "./base-entity";
import { BaseProps } from "./types";

/**
 * Entity - Has identity and lifecycle, but is not an aggregate root
 */
export class Entity<T extends BaseProps> extends BaseEntity<T> {}

/**
 * Aggregate - Aggregate root that manages a consistency boundary
 */
export class Aggregate<T extends BaseProps> extends BaseEntity<T> {}
