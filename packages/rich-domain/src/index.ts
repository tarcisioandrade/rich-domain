// ============================================================================
// Rich Domain Library - Main Exports
// ============================================================================

// Core Classes
export { Id } from "./id";
export { Entity, Aggregate } from "./entity";
export { ValueObject } from "./value-object";
export { Mapper } from "./mapper";

export * from "./validation-error";

// Domain Events
export * from "./domain-event";
export * from "./domain-event-bus";
export * from "./exceptions";

// Criteria
export * from "./criteria";
export * from "./paginated-result";

// Repository
export * from "./repository";

// Types
export {
  DomainEventHandler,
  EntityHooks,
  Filter,
  EntityValidation,
  IDomainEvent,
  VOValidation,
  VOHooks,
  ValidationConfig,
  Primitive,
  TransactionContext,
  PaginationMeta,
  Pagination,
  OrderDirection,
  Order,
  IUnitOfWork,
  IDomainEventHandler,
  EntityId,
  FieldPath,
  FilterOperator,
  Search,
} from "./types";

// Internal (for advanced usage)
