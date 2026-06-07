import {
  ValidationError,
  ValidationIssue,
  ValidationIssueCollector,
} from "../validation-error.js";
import {
  BaseProps,
  HistoryEntry,
  DeepJsonResult,
  EntityHooks,
  ValidationConfig,
  StandardSchema,
  EntityValidation,
} from "../types/index.js";
import { DEFAULT_VALIDATION_CONFIG } from "../constants.js";
import { DomainError } from "../exceptions.js";
import { ChangeTracker, AggregateChanges, Id, ValueObject } from "./index";
import { getStaticProperty } from "../utils/helpers.js";

export abstract class BaseEntity<
  T extends BaseProps,
  TOptionalInput extends keyof T = never,
> {
  private _props: T;
  private tracker: ChangeTracker;
  private proxiedProps: T;
  private snapshot: T | null = null;
  private validationConfig: Required<ValidationConfig>;
  private entityHooks?: EntityHooks<T, any>;
  private entitySchema?: StandardSchema<T>;
  private readonly issueCollector = new ValidationIssueCollector();

  protected static validation?: EntityValidation<any>;
  protected static hooks?: EntityHooks<any, any>;

  constructor(
    props: Omit<T, TOptionalInput | "id"> &
      Partial<Pick<T, TOptionalInput>> & { id?: Id }
  ) {
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
      this.runRulesHook();
    }

    if (hooks?.onCreate) {
      hooks.onCreate(this as any);
    }

    this.takeSnapshot();
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
    const merged = ValidationError.merge(existing, collectedIssues, {
      entityName: this.constructor.name,
    });

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
    if (!this.entityHooks?.rules) return;

    this.beginValidationCycle();
    this.entityHooks.rules(this as any);
    this.finalizeValidation([...this.issueCollector.getIssues()]);
  }

  private validateProps(props: T): void {
    const schemaError = this.validateSchema(props);
    if (!schemaError) return;

    if (this.validationConfig.throwOnError) {
      throw schemaError;
    }

    (this as any)._validationError = schemaError;
  }

  private validateSchema(props: T): ValidationError | null {
    if (!this.entitySchema) return null;

    const result = this.entitySchema["~standard"].validate(props);

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
        })),
        {
          entityName: this.constructor.name,
        }
      );
    }

    return null;
  }

  private handleValidationFailure(issues: ValidationIssue[]): void {
    if (issues.length === 0) {
      this.clearValidationError();
      return;
    }

    const error = ValidationError.fromIssues(issues, {
      entityName: this.constructor.name,
    });

    if (this.validationConfig.throwOnError) {
      throw error;
    }

    (this as any)._validationError = error;
  }

  private clearValidationError(): void {
    delete (this as any)._validationError;
  }

  /**
   * Validates the full current props (schema + rules). Used on updates when
   * throwOnError is false so validationErrors reflects every invalid field.
   */
  private collectCurrentValidationIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const schemaError = this.entitySchema
      ? this.validateSchema(this._props)
      : null;
    if (schemaError) {
      issues.push(...schemaError.issues);
    }

    if (this.entityHooks?.rules) {
      this.beginValidationCycle();
      this.entityHooks.rules(this as any);
      issues.push(...this.issueCollector.getIssues());
    }

    return issues;
  }

  /**
   * @returns true when the entity has no validation issues after refresh
   */
  private refreshValidationStateFromCurrentProps(): boolean {
    const issues = this.collectCurrentValidationIssues();

    if (issues.length === 0) {
      this.clearValidationError();
      return true;
    }

    this.handleValidationFailure(issues);
    return false;
  }

  /**
   * When true, failed schema/rules updates keep the mutated value and refresh
   * validationErrors (dirty / form mode). Requires throwOnError: false and
   * persistInvalidMutations: true.
   */
  private shouldPersistInvalidMutation(): boolean {
    return (
      !this.validationConfig.throwOnError &&
      this.validationConfig.persistInvalidMutations
    );
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
      const originalValue = this.getValueAtPath(self._props, path);
      this.setValueAtPath(self._props, path, newValue);

      try {
        if (
          !self.validationConfig.persistInvalidMutations &&
          (self as any)._validationError
        ) {
          this.setValueAtPath(self._props, path, originalValue);
          return false;
        }

        if (self.entityHooks?.onBeforeUpdate && self.snapshot) {
          const shouldContinue = self.entityHooks.onBeforeUpdate(
            self as any,
            self.snapshot
          );
          if (!shouldContinue) {
            this.setValueAtPath(self._props, path, originalValue);
            return false;
          }
        }

        if (!self.validationConfig.throwOnError) {
          const isValid = self.refreshValidationStateFromCurrentProps();
          if (!isValid) {
            if (!self.shouldPersistInvalidMutation()) {
              this.setValueAtPath(self._props, path, originalValue);
            }
            return self.shouldPersistInvalidMutation();
          }

          this.setValueAtPath(self._props, path, originalValue);
          return true;
        }

        const schemaError = self.entitySchema
          ? self.validateSchema(self._props)
          : null;

        if (schemaError) {
          this.setValueAtPath(self._props, path, originalValue);
          throw schemaError;
        }

        if (self.entityHooks?.rules) {
          self.beginValidationCycle();
          self.entityHooks.rules(self as any);
          const collected = [...self.issueCollector.getIssues()];

          if (collected.length > 0) {
            this.setValueAtPath(self._props, path, originalValue);
            throw ValidationError.fromIssues(collected, {
              entityName: self.constructor.name,
            });
          }
        }

        self.clearValidationError();
        this.setValueAtPath(self._props, path, originalValue);
        return true;
      } catch (error) {
        this.setValueAtPath(self._props, path, originalValue);
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
   * Recursively marks all nested entities as clean.
   */
  markAsClean(): void {
    this.tracker.markAsClean();
    this.takeSnapshot();
    this.forEachNestedEntity((entity) => entity.markAsClean());
  }

  /**
   * Clears history, marks entity as "clean" and marks the Id as not new.
   * Recursively marks all nested entities as persisted.
   * Call this after successfully persisting to the database.
   */
  markAsPersisted(): void {
    this.tracker.markAsClean();
    this.takeSnapshot();
    this.id.markAsNotNew();
    this.forEachNestedEntity((entity) => entity.markAsPersisted());
  }

  /**
   * Iterates over all nested entities (direct children only) and executes a callback.
   * This includes entities in arrays and single entity properties.
   */
  private forEachNestedEntity(
    callback: (entity: BaseEntity<any>) => void
  ): void {
    for (const value of Object.values(this._props)) {
      if (value instanceof BaseEntity) {
        callback(value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (item instanceof BaseEntity) {
            callback(item);
          }
        }
      }
    }
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

  private setValueAtPath(obj: any, path: string, value: any): void {
    if (!path) return;

    const parts = path.split(/[.\[\]]+/).filter(Boolean);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === null || current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]!] = value;
  }

  private getValueAtPath(obj: any, path: string): any {
    if (!path) return obj;

    const parts = path.split(/[.\[\]]+/).filter(Boolean);
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }
}
