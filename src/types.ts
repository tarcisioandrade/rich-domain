// ============================================================================
// Types & Interfaces for Validation
// ============================================================================

import { Id } from "./id";

// ============================================================================
// Base Props
// ============================================================================

export type EntityId = string | number;

export interface BaseProps {
  id: Id;
}

// ============================================================================
// Change Events
// ============================================================================

export interface ChangeEvent<T> {
  previous: T | undefined;
  current: T;
  path: string;
}

export interface ArrayChangeEvent<T> {
  toCreate: T[];
  toUpdate: T[];
  toDelete: T[];
  path: string;
}

export type PropertySubscriber<T> = (event: ChangeEvent<T>) => void;
export type ArraySubscriber<T> = (event: ArrayChangeEvent<T>) => void;

export interface PropertySubscription<T> {
  onChange: PropertySubscriber<T>;
}

export interface ArraySubscription<T> {
  onChange: ArraySubscriber<T>;
}

// ============================================================================
// Subscription Config
// ============================================================================

type UnwrapArray<T> = T extends Array<infer U> ? U : never;
type IsArray<T> = T extends Array<any> ? true : false;
type NonUndefined<T> = T extends undefined ? never : T;

export type SubscriptionConfig<T extends BaseProps> = {
  [K in keyof T]?: IsArray<NonUndefined<T[K]>> extends true
    ? ArraySubscription<UnwrapArray<NonUndefined<T[K]>>>
    : PropertySubscription<NonUndefined<T[K]>>;
};

// ============================================================================
// Validation Config
// ============================================================================

export interface ValidationConfig {
  onCreate?: boolean;
  onUpdate?: boolean;
  throwOnError?: boolean;
}

export const DEFAULT_VALIDATION_CONFIG: Required<ValidationConfig> = {
  onCreate: true,
  onUpdate: true,
  throwOnError: true,
};

// ============================================================================
// Standard Schema Types (Compatible with @standard-schema/spec)
// ============================================================================

// Flexible path segment to support various implementations (Zod, ArkType, Valibot, etc.)
export interface StandardSchemaIssue {
  message: string;
  path?: ReadonlyArray<unknown>;
}

export interface StandardSchemaResult<T> {
  value?: T;
  issues?: ReadonlyArray<StandardSchemaIssue>;
}

export interface StandardSchemaProps<T> {
  validate: (
    value: unknown
  ) => StandardSchemaResult<T> | Promise<StandardSchemaResult<T>>;
}

export interface StandardSchema<T = unknown> {
  "~standard": StandardSchemaProps<T>;
}

// ============================================================================
// Entity Validation
// ============================================================================

export interface EntityValidation<T> {
  schema: StandardSchema<T>;
  config?: ValidationConfig;
}

// ============================================================================
// Entity Hooks
// ============================================================================

export interface EntityHooks<T extends BaseProps, E> {
  onBeforeUpdate?: (entity: E, snapshot: T) => boolean;
  onCreate?: (entity: E) => void;
  rules?: (entity: E) => void;
  defaultValues?: Partial<Omit<T, "id">>;
}

// ============================================================================
// History Entry
// ============================================================================

export interface HistoryEntry {
  path: string;
  previousValue: any;
  currentValue: any;
  timestamp: number;
}

// ============================================================================
// Type Helpers
// ============================================================================

export type DeepJsonResult<T> = {
  [K in keyof T]: T[K] extends Id
    ? string
    : T[K] extends { toJson(): infer U }
    ? U
    : T[K] extends Array<infer U>
    ? U extends { toJson(): infer V }
      ? V[]
      : U extends Id
      ? string[]
      : U[]
    : T[K];
};

// ============================================================================
// Entity Constructor Type
// ============================================================================

export interface EntityConstructor<T extends BaseProps, E> {
  new (props: T): E;
  validation?: EntityValidation<T>;
  hooks?: EntityHooks<T, E>;
}
