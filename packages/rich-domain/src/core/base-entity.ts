import { ValidationError } from "../validation-error.js";
import {
  BaseProps,
  HistoryEntry,
  DeepJsonResult,
  EntityHooks,
  ValidationConfig,
  StandardSchema,
  EntityValidation,
  IDomainEventBus,
  IDomainEvent,
} from "../types/index.js";
import { DEFAULT_VALIDATION_CONFIG } from "../constants.js";
import { DomainError } from "../exceptions.js";
import { ChangeTracker, AggregateChanges, Id, ValueObject } from "./index";

function getStaticProperty<T>(
  instance: any,
  propertyName: string
): T | undefined {
  return instance.constructor[propertyName];
}

export abstract class BaseEntity<T extends BaseProps> {
  private _props: T;
  private tracker: ChangeTracker;
  private proxiedProps: T;
  private snapshot: T | null = null;
  private validationConfig: Required<ValidationConfig>;
  private entityHooks?: EntityHooks<T, any>;
  private entitySchema?: StandardSchema<T>;
  private domainEvents: IDomainEvent[] = [];

  protected static validation?: EntityValidation<any>;
  protected static hooks?: EntityHooks<any, any>;

  constructor(props: Omit<T, "id"> & { id?: Id }) {
    const validation = getStaticProperty<EntityValidation<T>>(
      this,
      "validation"
    );

    const hooks = getStaticProperty<EntityHooks<T, any>>(this, "hooks");

    if (!props.id) {
      props.id = new Id();
    }

    if (hooks?.onBeforeCreate) {
      hooks.onBeforeCreate(props as T);
    }

    this.entityHooks = hooks;

    if (validation?.schema) {
      this.entitySchema = validation.schema;
    }

    this.validationConfig = {
      ...DEFAULT_VALIDATION_CONFIG,
      ...validation?.config,
    };

    let finalProps = { ...props } as T;

    if (this.entitySchema && this.validationConfig.onCreate) {
      this.validateProps(finalProps);
    }

    this._props = finalProps;
    this.tracker = new ChangeTracker(this._props, this.constructor.name);

    if (this.validationConfig.onUpdate) {
      this.setupUpdateValidation();
    }

    this.proxiedProps = this.tracker.createProxy();

    if (hooks?.rules) {
      hooks.rules(this as any);
    }

    if (hooks?.onCreate) {
      hooks.onCreate(this as any);
    }

    this.takeSnapshot();
  }

  private validateProps(props: T): void {
    if (!this.entitySchema) return;

    const result = this.entitySchema["~standard"].validate(props);

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
        })),
        {
          entityName: this.constructor.name,
        }
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
   * Setup validation that runs on every property change.
   * Uses the ChangeTracker's onChangeValidator callback.
   */
  private setupUpdateValidation(): void {
    const self = this;

    this.tracker.setOnChangeValidator((path, newValue) => {
      const originalValue = self._props[path as keyof T];
      (self._props as any)[path] = newValue;

      try {
        if (self.entityHooks?.onBeforeUpdate && self.snapshot) {
          const shouldContinue = self.entityHooks.onBeforeUpdate(
            self as any,
            self.snapshot
          );
          if (!shouldContinue) {
            (self._props as any)[path] = originalValue;
            return false;
          }
        }

        if (self.entitySchema) {
          const result = self.entitySchema["~standard"].validate(self._props);

          if (result instanceof Promise) {
            console.warn(
              "Async validation on update not supported. Consider using sync validation."
            );
            (self._props as any)[path] = originalValue;
            return true;
          }

          if (result.issues && result.issues.length > 0) {
            const validationError = new ValidationError(
              result.issues.map((issue) => ({
                path: issue.path?.map((p) => self.extractPathKey(p)) || [],
                message: issue.message,
              })),
              {
                entityName: self.constructor.name,
              }
            );

            (self._props as any)[path] = originalValue;

            if (self.validationConfig.throwOnError) {
              throw validationError;
            }

            console.error("Validation failed on update:", validationError);
            return false;
          }
        }

        if (self.entityHooks?.rules) {
          try {
            self.entityHooks.rules(self as any);
          } catch (error) {
            (self._props as any)[path] = originalValue;

            if (self.validationConfig.throwOnError) {
              throw error;
            }

            console.error("Rules validation failed on update:", error);
            return false;
          }
        }

        (self._props as any)[path] = originalValue;
        return true;
      } catch (error) {
        (self._props as any)[path] = originalValue;
        throw error;
      }
    });
  }

  private takeSnapshot(): void {
    this.snapshot = this.deepCloneProps(this._props);
  }

  private deepCloneProps(obj: any, seen: WeakSet<object> = new WeakSet()): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== "object") return obj;
    if (obj instanceof Id) return obj;
    if (obj instanceof Date) return new Date(obj.getTime());

    if (seen.has(obj)) {
      return obj;
    }

    if (obj instanceof BaseEntity) {
      return obj;
    }

    if (
      obj.constructor &&
      obj.constructor.name !== "Object" &&
      obj.constructor.name !== "Array"
    ) {
      if (
        typeof obj.toJSON === "function" &&
        typeof obj.equals === "function"
      ) {
        return obj;
      }
    }

    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepCloneProps(item, seen));
    }

    if (obj.constructor === Object) {
      try {
        return structuredClone(obj);
      } catch {
        const cloned: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = this.deepCloneProps(obj[key], seen);
          }
        }
        return cloned;
      }
    }

    return obj;
  }

  get id(): Id {
    return this._props.id;
  }

  public isNew(): boolean {
    return this._props.id.isNew();
  }

  /**
   * Check equality with another entity by comparing IDs
   */
  equals(other: BaseEntity<T> | Id | string): boolean {
    if (!other) {
      return false;
    }

    if (other instanceof BaseEntity) {
      return this.id.equals(other.id);
    }

    if (other instanceof Id) {
      return this.id.equals(other);
    }

    if (typeof other === "string") {
      return this.id.equals(other);
    }

    return false;
  }

  public get props(): T {
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

  /**
   * Returns all detected changes as AggregateChanges.
   *
   * @example
   * ```typescript
   * const changes = user.getChanges();
   * const batch = changes.toBatchOperations();
   *
   * for (const del of batch.deletes) { ... }
   * for (const create of batch.creates) { ... }
   * for (const upd of batch.updates) { ... }
   * ```
   */
  getChanges<TEntityMap = Record<string, any>>(): AggregateChanges<TEntityMap> {
    return this.tracker.getChanges<TEntityMap>();
  }

  /**
   * Returns the change history (for debugging).
   */
  getHistory(): HistoryEntry[] {
    return this.tracker.getHistory();
  }

  /**
   * Clears history and marks entity as "clean".
   * Call this after successfully persisting to the database.
   */
  markAsClean(): void {
    this.tracker.markAsClean();
    this.takeSnapshot();
  }

  /**
   * Add a domain event to this entity
   */
  protected addDomainEvent(event: IDomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Dispatch all events through the event bus
   */
  public async dispatchAll(bus: IDomainEventBus): Promise<void> {
    await bus.publishAll(this.getUncommittedEvents());
    this.clearEvents();
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
   * Check if entity has uncommitted events
   */
  hasUncommittedEvents(): boolean {
    return this.domainEvents.length > 0;
  }

  toJSON(): DeepJsonResult<T> {
    return this.deepToJson(this._props) as DeepJsonResult<T>;
  }

  private deepToJson(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Id) return obj.value;
    if (obj instanceof ValueObject) return obj.value;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map((item) => this.deepToJson(item));
    if (obj instanceof BaseEntity) return obj.toJSON();
    if (obj && typeof obj.toJSON === "function") return obj.toJSON();
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
