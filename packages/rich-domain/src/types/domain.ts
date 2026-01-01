import { Id } from "../id.js";
import { StandardSchema } from "./standard-schema.js";

export interface BaseProps {
  id: Id;
}

interface DomainValidation<T> {
  schema: StandardSchema<T>;
  config?: ValidationConfig;
}

export type EntityValidation<T> = DomainValidation<T>;
export type VOValidation<T> = DomainValidation<T>;

export interface VOHooks<V, VO> {
  onBeforeCreate?: (value: V) => void;
  rules?: (valueObject: VO) => void;
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
