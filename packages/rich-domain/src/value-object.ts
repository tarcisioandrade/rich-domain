// ============================================================================
// Value Object - Immutable Domain Objects (Updated with identityKey support)
// ============================================================================

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

// Helper to get static properties from constructor
function getStaticProperty<T>(
  instance: any,
  propertyName: string
): T | undefined {
  return instance.constructor[propertyName];
}

/**
 * Tipo para a chave de identidade de um Value Object
 * Pode ser uma única chave ou um array de chaves (chave composta)
 */
export type IdentityKeyDefinition<T> = keyof T | (keyof T)[];

export abstract class ValueObject<T> {
  protected readonly props!: T;
  private validationConfig: Required<ValidationConfig>;
  private domainHooks?: VOHooks<T, any>;
  private domainSchema?: StandardSchema<T>;
  private domainEvents: IDomainEvent[] = [];

  // Static properties that subclasses can override
  protected static validation?: EntityValidation<any>;
  protected static hooks?: VOHooks<any, any>;

  /**
   * Chave de identidade para identificação em coleções.
   *
   * Usado pelo HistoryTracker para detectar mudanças em arrays de Value Objects.
   *
   * @example
   * ```typescript
   * // Chave simples
   * class TagReference extends ValueObject<{ tagId: string }> {
   *   static readonly identityKey = 'tagId' as const;
   * }
   *
   * // Chave composta
   * class Like extends ValueObject<{ postId: string; userId: string }> {
   *   static readonly identityKey = ['postId', 'userId'] as const;
   * }
   * ```
   */
  protected static identityKey?: IdentityKeyDefinition<any>;

  constructor(props: T) {
    // Get static configuration from subclass
    const validation = getStaticProperty<EntityValidation<T>>(
      this,
      "validation"
    );
    const hooks = getStaticProperty<VOHooks<T, any>>(this, "hooks");

    this.domainHooks = hooks;

    if (validation?.schema) {
      this.domainSchema = validation.schema;
    }

    this.validationConfig = {
      ...DEFAULT_VALIDATION_CONFIG,
      ...validation?.config,
    };

    let finalProps = { ...props } as T;

    // Validate schema on creation
    if (this.domainSchema && this.validationConfig.onCreate) {
      this.validateProps(finalProps);
    }

    // Set props (not frozen yet) so rules can access them
    (this as any).props = finalProps;

    // Execute rules (custom validations) - after props is set but before freezing
    if (hooks?.rules) {
      hooks.rules(this as any);
    }

    // Now freeze the props for immutability
    Object.freeze(this.props);

    // Hook onCreate
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

      // If not throwing, store error for later retrieval
      (this as any)._validationError = validationError;
    }
  }

  private extractPathKey(pathSegment: unknown): string {
    if (pathSegment === null || pathSegment === undefined) {
      return "";
    }
    // Handle PropertyKey (string | number | symbol)
    if (typeof pathSegment === "string" || typeof pathSegment === "number") {
      return String(pathSegment);
    }
    if (typeof pathSegment === "symbol") {
      return pathSegment.toString();
    }
    // Handle object with 'key' property (Zod's PathSegment)
    if (typeof pathSegment === "object" && "key" in pathSegment) {
      return String((pathSegment as { key: unknown }).key);
    }
    // Fallback
    return String(pathSegment);
  }

  /**
   * Check if value object has validation errors (when throwOnError is false)
   */
  get hasValidationErrors(): boolean {
    return !!(this as any)._validationError;
  }

  /**
   * Get validation errors (when throwOnError is false)
   */
  get validationErrors(): ValidationError | undefined {
    return (this as any)._validationError;
  }

  equals(other: ValueObject<T>): boolean {
    if (!other || !(other instanceof ValueObject)) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  /**
   * Retorna a chave de identidade deste Value Object.
   *
   * Usado para identificação em coleções quando `identityKey` está definido.
   *
   * @returns String com a chave de identidade ou null se não definido
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
      // Chave composta
      return keyDef.map((k) => String(this.props[k])).join(":");
    }

    // Chave simples
    return String(this.props[keyDef]);
  }

  /**
   * Verifica se este Value Object tem uma chave de identidade definida
   */
  hasIdentityKey(): boolean {
    return getStaticProperty<IdentityKeyDefinition<T>>(this, "identityKey") !== undefined;
  }

  /**
   * Retorna a definição da chave de identidade (se houver)
   */
  static getIdentityKeyDefinition<P>(): IdentityKeyDefinition<P> | undefined {
    return (this as any).identityKey;
  }

  /**
   * Add a domain event to this value object
   */
  protected addDomainEvent(event: IDomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Get all uncommitted domain events
   */
  getUncommittedEvents(): IDomainEvent[] {
    return [...this.domainEvents];
  }

  /**
   * Clear all domain events (call after publishing)
   */
  clearEvents(): void {
    this.domainEvents = [];
  }

  /**
   * Check if value object has uncommitted events
   */
  hasUncommittedEvents(): boolean {
    return this.domainEvents.length > 0;
  }

  toJson(): T {
    return { ...this.props };
  }

  /**
   * Create a new ValueObject with updated properties
   * Since ValueObjects are immutable, this returns a new instance
   */
  protected clone(updates: Partial<T>): this {
    const Constructor = this.constructor as new (props: T) => this;
    return new Constructor({ ...this.props, ...updates });
  }
}