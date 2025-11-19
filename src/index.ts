// ============================================================================
// Rich Domain Library - Main Exports
// ============================================================================

// Core Classes
export { Id } from "./id";
export { BaseEntity } from "./base-entity";
export { Entity, Aggregate } from "./entity";
export { ValueObject } from "./value-object";

export * from "./validation-error";

// Domain Events
export * from "./domain-event";

export * from "./domain-event-bus";

// Criteria & Repository
export * from "./criteria";
export * from "./paginated-result";

// Repository
export * from "./repository";

// Types
export * from "./types";

export * from "./constants";

// Internal (for advanced usage)
export { DeepProxy } from "./deep-proxy";
