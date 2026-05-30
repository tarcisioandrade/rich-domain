import {
  ValidationError,
  ValidationIssue,
  ValidationIssueCollector,
} from "../validation-error.js";
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
  private domainHooks?: VOHooks<T, any>;
  private domainSchema?: StandardSchema<T>;
  private readonly issueCollector = new ValidationIssueCollector();

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
      this.runRulesHook();
    }

    Object.freeze(this);
  }

  /**
   * Add a validation issue during rules hook execution (non-throwing mode).
   */
  public addValidationIssue(path: string | string[], message: string): void {
    this.issueCollector.add(path, message);
  }

  private beginValidationCycle(): void {
    this.issueCollector.clear();
  }

  private finalizeValidation(collectedIssues: ValidationIssue[] = []): void {
    const existing = (this as any)._validationError as
      | ValidationError
      | undefined;
    const merged = ValidationError.merge(existing, collectedIssues);

    if (!merged) {
      delete (this as any)._validationError;
      return;
    }

    if (this.validationConfig.throwOnError) {
      throw merged;
    }

    (this as any)._validationError = merged;
  }

  private runRulesHook(): void {
    if (!this.domainHooks?.rules) return;

    this.beginValidationCycle();
    this.domainHooks.rules(this as any);
    this.finalizeValidation([...this.issueCollector.getIssues()]);
  }

  private validateValue(value: T): void {
    const schemaError = this.validateSchema(value);
    if (!schemaError) return;

    if (this.validationConfig.throwOnError) {
      throw schemaError;
    }

    (this as any)._validationError = schemaError;
  }

  private validateSchema(value: T): ValidationError | null {
    if (!this.domainSchema) return null;

    const result = this.domainSchema["~standard"].validate(value);

    if (result instanceof Promise) {
      throw new DomainError(
        "Async validation not supported in constructor. Use sync validation schema."
      );
    }

    if (result.issues && result.issues.length > 0) {
      return new ValidationError(
        result.issues.map((issue) => ({
          path: issue.path?.map((p) => this.extractPathKey(p)) || [],
          message: issue.message,
        }))
      );
    }

    return null;
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
