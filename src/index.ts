// ============================================================================
// Rich Domain Library - Main Exports
// ============================================================================

// Core Classes
export { Id } from "./id";
export { BaseEntity } from "./base-entity";
export { Entity, Aggregate } from "./entity";
export { ValueObject } from "./value-object";

export {
  ValidationError,
  ValidationIssue,
  createValidationIssue,
  throwValidationError,
} from "./validation-error";

// Domain Events
export {
  DomainEvent,
  IDomainEvent,
  DomainEventHandler,
  IDomainEventHandler,
} from "./domain-event";

export { DomainEventBus, getEventBus } from "./domain-event-bus";

// Criteria & Repository
export {
  Criteria,
  TypedFilter,
  FilterOperator,
  Order,
  OrderDirection,
  Pagination,
  PaginationMeta,
  PaginatedResult,
  createPaginationMeta,
  createPaginatedResult,
  applyCriteriaToArray,
} from "./criteria";

// Repository
export {
  Repository,
  ExtendedRepository,
  InMemoryRepository,
} from "./repository";

// Types
export {
  BaseProps,
  EntityId,
  ChangeEvent,
  ArrayChangeEvent,
  PropertySubscriber,
  ArraySubscriber,
  PropertySubscription,
  ArraySubscription,
  SubscriptionConfig,
  ValidationConfig,
  VOHooks,
  EntityValidation,
  EntityHooks,
  HistoryEntry,
  DeepJsonResult,
  StandardSchema,
  StandardSchemaProps,
  StandardSchemaIssue,
  StandardSchemaResult,
  DEFAULT_VALIDATION_CONFIG,
} from "./types";

// Internal (for advanced usage)
export { DeepProxy } from "./deep-proxy";
