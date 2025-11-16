// ============================================================================
// Base Entity Class with Standard Schema Validation
// ============================================================================

import { Id } from "./id";
import { DeepProxy } from "./deep-proxy";
import { ValidationError } from "./validation-error";
import {
  BaseProps,
  SubscriptionConfig,
  HistoryEntry,
  DeepJsonResult,
  EntityValidation,
  EntityHooks,
  ValidationConfig,
  DEFAULT_VALIDATION_CONFIG,
  StandardSchema,
} from "./types";

// Helper to get static properties from constructor
function getStaticProperty<T>(
  instance: any,
  propertyName: string
): T | undefined {
  return instance.constructor[propertyName];
}

export abstract class BaseEntity<T extends BaseProps> {
  protected props: T;
  private proxy: DeepProxy;
  private proxiedProps: T;
  private snapshot: T | null = null;
  private validationConfig: Required<ValidationConfig>;
  private entityHooks?: EntityHooks<T, any>;
  private entitySchema?: StandardSchema<T>;

  // Static properties that subclasses can override
  protected static validation?: EntityValidation<any>;
  protected static hooks?: EntityHooks<any, any>;

  constructor(props: Partial<Omit<T, "id">> & { id?: Id }) {
    // Get static configuration from subclass
    const validation = getStaticProperty<EntityValidation<T>>(
      this,
      "validation"
    );
    const hooks = getStaticProperty<EntityHooks<T, any>>(this, "hooks");

    this.entityHooks = hooks;

    // Auto-convert schema to Standard Schema if needed
    if (validation?.schema) {
      this.entitySchema = validation.schema;
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

    // Generate ID if not provided
    if (!finalProps.id) {
      finalProps.id = new Id();
    }

    // Validate schema on creation
    if (this.entitySchema && this.validationConfig.onCreate) {
      this.validateProps(finalProps);
    }

    this.props = finalProps;
    this.proxy = new DeepProxy(this.props);
    this.proxiedProps = this.proxy.createProxy();

    // Execute rules (custom validations)
    if (hooks?.rules) {
      hooks.rules(this as any);
    }

    // Hook onCreate
    if (hooks?.onCreate) {
      hooks.onCreate(this as any);
    }

    // Setup update validation
    if (this.entitySchema && this.validationConfig.onUpdate) {
      this.setupUpdateValidation();
    }

    // Take initial snapshot for onBeforeUpdate
    this.takeSnapshot();
  }

  private validateProps(props: T): void {
    if (!this.entitySchema) return;

    const result = this.entitySchema["~standard"].validate(props);

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

  private setupUpdateValidation(): void {
    const self = this;

    const validateOnChange = () => {
      // Check onBeforeUpdate hook
      if (self.entityHooks?.onBeforeUpdate && self.snapshot) {
        const shouldContinue = self.entityHooks.onBeforeUpdate(
          self as any,
          self.snapshot
        );
        if (!shouldContinue) {
          // Revert changes
          Object.assign(self.props, self.snapshot);
          return;
        }
      }

      // Validate with schema
      if (self.entitySchema) {
        const result = self.entitySchema["~standard"].validate(self.props);

        if (result instanceof Promise) {
          console.warn(
            "Async validation on update not supported. Consider using sync validation."
          );
          return;
        }

        if (result.issues && result.issues.length > 0) {
          const validationError = new ValidationError(
            result.issues.map((issue) => ({
              path: issue.path?.map((p) => self.extractPathKey(p)) || [],
              message: issue.message,
            }))
          );

          if (self.validationConfig.throwOnError) {
            // Revert changes before throwing
            if (self.snapshot) {
              Object.assign(self.props, self.snapshot);
            }
            throw validationError;
          }
          console.error("Validation failed on update:", validationError);
        }
      }

      // Execute rules after schema validation
      if (self.entityHooks?.rules) {
        try {
          self.entityHooks.rules(self as any);
        } catch (error) {
          if (self.validationConfig.throwOnError) {
            // Revert changes before throwing
            if (self.snapshot) {
              Object.assign(self.props, self.snapshot);
            }
            throw error;
          }
          console.error("Rules validation failed on update:", error);
        }
      }

      // Update snapshot after successful validation
      self.takeSnapshot();
    };

    // Subscribe to all changes
    this.proxy.subscribe("*", validateOnChange);
  }

  private takeSnapshot(): void {
    this.snapshot = this.deepCloneProps(this.props);
  }

  private deepCloneProps(obj: any, seen: WeakSet<object> = new WeakSet()): any {
    if (obj === null || obj === undefined) return obj;

    // Primitives
    if (typeof obj !== "object") return obj;

    // Special cases - don't clone these, just return the reference
    if (obj instanceof Id) return obj;
    if (obj instanceof Date) return new Date(obj.getTime());

    // Check for circular references
    if (seen.has(obj)) {
      return obj; // Return reference to avoid infinite loop
    }

    // Handle BaseEntity instances - just keep the reference
    if (obj instanceof BaseEntity) {
      return obj;
    }

    // Handle ValueObject instances - just keep the reference (they're immutable)
    if (
      obj.constructor &&
      obj.constructor.name !== "Object" &&
      obj.constructor.name !== "Array"
    ) {
      // Check if it has toJson method (likely a ValueObject or similar)
      if (
        typeof obj.toJson === "function" &&
        typeof obj.equals === "function"
      ) {
        return obj; // Keep reference for ValueObjects
      }
    }

    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepCloneProps(item, seen));
    }

    // Plain objects only
    if (obj.constructor === Object) {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepCloneProps(obj[key], seen);
        }
      }
      return cloned;
    }

    // For other object types (custom classes), just keep the reference
    return obj;
  }

  get id(): Id {
    return this.props.id;
  }

  get isNew(): boolean {
    return this.props.id.isNew;
  }

  protected get properties(): T {
    return this.proxiedProps;
  }

  /**
   * Check if entity has validation errors (when throwOnError is false)
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

  subscribe(config: SubscriptionConfig<T>): void {
    Object.keys(config).forEach((key) => {
      const sub = config[key as keyof T];
      if (sub && "onChange" in sub) {
        this.proxy.subscribe(key, sub.onChange);
      }
    });
  }

  getHistory(): HistoryEntry[] {
    return this.proxy.getHistory();
  }

  clearHistory(): void {
    this.proxy.clearHistory();
  }

  toJson(): DeepJsonResult<T> {
    return this.deepToJson(this.props) as DeepJsonResult<T>;
  }

  private deepToJson(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Id) return obj.value;
    if (Array.isArray(obj)) return obj.map((item) => this.deepToJson(item));
    if (obj instanceof BaseEntity) return obj.toJson();
    if (obj && typeof obj.toJson === "function") return obj.toJson();
    if (typeof obj === "object") {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) result[key] = this.deepToJson(obj[key]);
      }
      return result;
    }
    return obj;
  }
}
