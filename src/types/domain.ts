import { StandardSchema, ValidationConfig } from "..";
import { Id } from "../id";

export type EntityId = string | number;

export interface BaseProps {
  id: Id;
}

interface DomainValidation<T> {
  schema: StandardSchema<T>;
  config?: ValidationConfig;
}

export type EntityValidation<T> = DomainValidation<T>;
export type VOValidation<T> = DomainValidation<T>;


export interface VOHooks<T, E> {
  onBeforeUpdate?: (entity: E, snapshot: T) => boolean;
  onCreate?: (entity: E) => void;
  rules?: (entity: E) => void;
  defaultValues?: Partial<T>;
}

// Specialized hooks for entities (with BaseProps)
export interface EntityHooks<T extends BaseProps, E> {
  onBeforeUpdate?: (entity: E, snapshot: T) => boolean;
  onCreate?: (entity: E) => void;
  rules?: (entity: E) => void;
}

export interface EntityConstructor<T extends BaseProps, E> {
  new (props: T): E;
  validation?: DomainValidation<T>;
  hooks?: EntityHooks<T, E>;
}
