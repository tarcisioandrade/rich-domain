import { ValidationError } from "./validation-error";
import { IDomainEvent } from ".";
import {
  VOHooks,
  ValidationConfig,
  StandardSchema,
  EntityValidation,
} from "./types";
import { DEFAULT_VALIDATION_CONFIG } from "./constants";
import { DomainError } from "./exceptions";

function getStaticProperty<T>(
  instance: any,
  propertyName: string
): T | undefined {
  return instance.constructor[propertyName];
}

/**
 * Identity key type for a Value Object. Can be a single key or an array of keys (composite key).
 */
export type IdentityKeyDefinition<T> = (keyof T)[] | keyof T;

export abstract class ValueObject<T> {
  protected readonly props!: T;
  private validationConfig: Required<ValidationConfig>;
  private domainHooks?: VOHooks<T, any>;
  private domainSchema?: StandardSchema<T>;
  private domainEvents: IDomainEvent[] = [];

  protected static validation?: EntityValidation<any>;
  protected static hooks?: VOHooks<any, any>;

  /**
   * Identity key for identification in collections.
   * Used by ChangeTracker to track changes in arrays of Value Objects.
   *
   * @example
   * ```typescript
   * // Simple key
   * class TagReference extends ValueObject<{ tagId: string }> {
   *   static readonly identityKey = 'tagId';
   * }
   *
   * // Composite key
   * class Like extends ValueObject<{ postId: string; userId: string }> {
   *   static readonly identityKey = ['postId', 'userId'];
   * }
   * ```
   */
  protected static identityKey?: IdentityKeyDefinition<any>;

  constructor(props: T) {
    const validation = getStaticProperty<EntityValidation<T>>(
      this,
      "validation"
    );
    const hooks = getStaticProperty<VOHooks<T, any>>(this, "hooks");

    if (hooks?.onBeforeCreate) {
      hooks.onBeforeCreate(props as T);
    }

    this.domainHooks = hooks;

    if (validation?.schema) {
      this.domainSchema = validation.schema;
    }

    this.validationConfig = {
      ...DEFAULT_VALIDATION_CONFIG,
      ...validation?.config,
    };

    let finalProps = { ...props } as T;

    if (this.domainSchema && this.validationConfig.onCreate) {
      this.validateProps(finalProps);
    }

    (this as any).props = finalProps;

    if (hooks?.rules) {
      hooks.rules(this as any);
    }

    Object.freeze(this.props);

    if (hooks?.onCreate) {
      hooks.onCreate(this as any);
    }
  }

  private validateProps(props: T): void {
    if (!this.domainSchema) return;

    const result = this.domainSchema["~standard"].validate(props);

    if (result instanceof Promise) {
      throw new DomainError(
        "Async validation not supported in constructor. Use sync validation schema."
      );
    }

    if (result.issues && result.issues.length > 0) {
      const validationError = new ValidationError(
        result.issues.map((issue) => ({
          path: issue.path?.map((p) => this.extractPathKey(p)) || [],
          message: issue.message,
        }))
      );

      if (this.validationConfig.throwOnError) {
        throw validationError;
      }

      (this as any)._validationError = validationError;
    }
  }

  private extractPathKey(pathSegment: unknown): string {
    if (pathSegment === null || pathSegment === undefined) {
      return "";
    }
    if (typeof pathSegment === "string" || typeof pathSegment === "number") {
      return String(pathSegment);
    }
    if (typeof pathSegment === "symbol") {
      return pathSegment.toString();
    }
    if (typeof pathSegment === "object" && "key" in pathSegment) {
      return String((pathSegment as { key: unknown }).key);
    }
    return String(pathSegment);
  }

  /**
   * Returns true if the value object has validation errors (when throwOnError is false).
   */
  get hasValidationErrors(): boolean {
    return !!(this as any)._validationError;
  }

  /**
   * Returns the validation errors (when throwOnError is false).
   */
  get validationErrors(): ValidationError | undefined {
    return (this as any)._validationError;
  }

  /**
   * Compare this ValueObject with another for equality based on their properties.
   */
  equals(other: ValueObject<T>): boolean {
    if (!other || !(other instanceof ValueObject)) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  /**
   * Returns the identity key for this Value Object.
   * Used for identification in collections when identityKey is set.
   *
   * @returns String with the identity key or null if not defined
   *
   * @example
   * ```typescript
   * const like = new Like({ postId: 'p1', userId: 'u1' });
   * like.getIdentityKey(); // 'p1:u1'
   *
   * const tag = new TagReference({ tagId: 'tag-123' });
   * tag.getIdentityKey(); // 'tag-123'
   * ```
   */
  getIdentityKey(): string | null {
    const keyDef = getStaticProperty<IdentityKeyDefinition<T>>(
      this,
      "identityKey"
    );

    if (!keyDef) {
      return null;
    }

    if (Array.isArray(keyDef)) {
      return keyDef.map((k) => String(this.props[k])).join(":");
    }

    return String(this.props[keyDef]);
  }

  /**
   * Returns true if this Value Object has an identity key defined.
   */
  hasIdentityKey(): boolean {
    return (
      getStaticProperty<IdentityKeyDefinition<T>>(this, "identityKey") !==
      undefined
    );
  }

  /**
   * Returns the identity key definition (if any).
   */
  static getIdentityKeyDefinition<P>(): IdentityKeyDefinition<P> | undefined {
    return (this as any).identityKey;
  }

  /**
   * Adds a domain event to this value object.
   */
  protected addDomainEvent(event: IDomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Returns all uncommitted domain events.
   */
  getUncommittedEvents(): IDomainEvent[] {
    return [...this.domainEvents];
  }

  /**
   * Clears all domain events (call after publishing).
   */
  clearEvents(): void {
    this.domainEvents = [];
  }

  /**
   * Returns true if the value object has uncommitted events.
   */
  hasUncommittedEvents(): boolean {
    return this.domainEvents.length > 0;
  }

  toJSON(): T {
    return { ...this.props };
  }

  /**
   * Creates a new ValueObject with updated properties.
   * ValueObjects are immutable, so this returns a new instance.
   */
  protected clone(updates: Partial<T>): this {
    const Constructor = this.constructor as new (props: T) => this;
    return new Constructor({ ...this.props, ...updates });
  }
}
