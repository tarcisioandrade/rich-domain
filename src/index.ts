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
