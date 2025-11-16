// ============================================================================
// Value Object - Immutable Domain Objects
// ============================================================================

import { ValidationError } from "./validation-error";
import {
  VOHooks,
  ValidationConfig,
  DEFAULT_VALIDATION_CONFIG,
  StandardSchema,
  EntityValidation,
} from "./types";

// Helper to get static properties from constructor
function getStaticProperty<T>(
  instance: any,
  propertyName: string
): T | undefined {
  return instance.constructor[propertyName];
}

export abstract class ValueObject<T> {
  protected readonly props!: T;
  private validationConfig: Required<ValidationConfig>;
  private domainHooks?: VOHooks<T, any>;
  private domainSchema?: StandardSchema<T>;

  // Static properties that subclasses can override
  protected static validation?: EntityValidation<any>;
  protected static hooks?: VOHooks<any, any>;

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

    // Apply defaultValues
    let finalProps = { ...props } as T;
    if (hooks?.defaultValues) {
      finalProps = { ...hooks.defaultValues, ...props } as T;
    }

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
      throw new Error(
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
