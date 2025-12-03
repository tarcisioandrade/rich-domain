import { Id } from "../id";
import { StandardSchema } from "./standard-schema";

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
  onBeforeCreate?: (props: T) => void;
  onBeforeUpdate?: (entity: E, snapshot: T) => boolean;
  onCreate?: (entity: E) => void;
  rules?: (entity: E) => void;
}

export interface EntityHooks<T extends BaseProps, E> {
  onBeforeCreate?: (props: T) => void;
  onBeforeUpdate?: (entity: E, snapshot: T) => boolean;
  onCreate?: (entity: E) => void;
  rules?: (entity: E) => void;
}

export interface ValidationConfig {
  onCreate?: boolean;
  onUpdate?: boolean;
  throwOnError?: boolean;
}
