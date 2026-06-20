import { Id } from "../core/index.js";
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
  /** When true, validates the entity on creation. Default: true */
  onCreate?: boolean;
  /** When true, validates the entity on update. Default: true */
  onUpdate?: boolean;
  /** When true, throws a ValidationError when validation fails. Default: true */
  throwOnError?: boolean;
  /**
   * When `throwOnError` is `false`, controls whether invalid updates are kept on the entity.
   * - `true` (default): apply mutations and refresh `validationErrors` (dirty / form mode).
   * - `false`: block mutations when errors already exist, and revert updates that fail validation.
   */
  persistInvalidMutations?: boolean;
}
