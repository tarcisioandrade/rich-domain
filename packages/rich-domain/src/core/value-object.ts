import { ValidationError } from "../validation-error.js";
import {
  VOHooks,
  ValidationConfig,
  StandardSchema,
  EntityValidation,
  Primitive,
} from "../types/index.js";
import { DEFAULT_VALIDATION_CONFIG } from "../constants.js";
import { DomainError } from "../exceptions.js";

function getStaticProperty<T>(
  instance: any,
  propertyName: string
): T | undefined {
  return instance.constructor[propertyName];
}

export abstract class ValueObject<T extends Primitive> {
  public readonly value!: T;
  private validationConfig: Required<ValidationConfig>;
  // @ts-expect-error - This is a private property
  private domainHooks?: VOHooks<T, any>;
  private domainSchema?: StandardSchema<T>;

  protected static validation?: EntityValidation<any>;
  protected static hooks?: VOHooks<any, any>;

  constructor(value: T) {
    const validation = getStaticProperty<EntityValidation<T>>(
      this,
      "validation"
    );
    const hooks = getStaticProperty<VOHooks<T, any>>(this, "hooks");

    if (hooks?.onBeforeCreate) {
      hooks.onBeforeCreate(value);
    }

    this.domainHooks = hooks;

    if (validation?.schema) {
      this.domainSchema = validation.schema;
    }

    this.validationConfig = {
      ...DEFAULT_VALIDATION_CONFIG,
      ...validation?.config,
    };

    if (this.domainSchema && this.validationConfig.onCreate) {
      this.validateValue(value);
    }

    this.value = value;

    if (hooks?.rules) {
      hooks.rules(this as any);
    }

    Object.freeze(this);
  }

  private validateValue(value: T): void {
    if (!this.domainSchema) return;

    const result = this.domainSchema["~standard"].validate(value);

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
    return this.value === other.value;
  }

  /**
   * Creates a new ValueObject with updated value.
   * ValueObjects are immutable, so this returns a new instance.
   */
  protected clone(value: T): this {
    const Constructor = this.constructor as new (value: T) => this;
    return new Constructor(value);
  }
}
