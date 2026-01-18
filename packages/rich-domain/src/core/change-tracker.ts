import { Id } from "./id.js";
import { Entity } from "./entity.js";
import { ValueObject } from "./value-object.js";
import { ArrayState, HistoryEntry, TrackedItem } from "../types/index.js";
import { EntityChangeState } from "../types/change-tracker.js";
import { AggregateChanges } from "./aggregate-changes.js";

/**
 * Callback for validation on property change.
 * Return false to reject the change, or throw an error.
 */
export type OnChangeValidator = (path: string, newValue: any) => boolean | void;

/**
 * Tracks changes in Aggregates using Proxy.
 *
 * Features:
 * - Tracks changes in primitive properties
 * - Tracks changes in nested entities (1:1)
 * - Tracks changes in collections (1:N)
 * - Calculates depth automatically
 * - Generates AggregateChanges for persistence
 * - Supports validation on change via onChangeValidator
 */
export class ChangeTracker {
  private history: HistoryEntry[] = [];
  private originalValues: Map<string, any> = new Map();
  private trackedArrays: Map<string, ArrayState> = new Map();
  private trackedEntities: Map<string, TrackedItem> = new Map();
  private onChangeValidator?: OnChangeValidator;

  constructor(
    private target: any,
    private rootEntityName: string,
    private path: string = "",
    private depth: number = 0,
    // @ts-expect-error - This is a private property
    private parentId?: string,
    // @ts-expect-error - This is a private property
    private parentEntity?: string,
    private rootTracker?: ChangeTracker
  ) {
    if (!rootTracker) {
      this.rootTracker = this;
    }
    this.captureInitialState();
  }

  /**
   * Sets a validator callback that will be called on every property change.
   * The validator can:
   * - Return false to reject the change (value will be reverted)
   * - Throw an error to reject the change with an error
   * - Return true/undefined to accept the change
   */
  setOnChangeValidator(validator: OnChangeValidator): void {
    this.getRootTracker().onChangeValidator = validator;
  }

  private captureInitialState(): void {
    if (this.depth > 0) return;
    this.captureEntityState(this.target, this.rootEntityName, "", 0);
  }

  private captureEntityState(
    obj: any,
    entityName: string,
    path: string,
    depth: number,
    parentId?: string,
    parentEntity?: string
  ): void {
    if (!obj || typeof obj !== "object") return;

    const id = this.getEntityId(obj);
    const key = path || "root";

    this.trackedEntities.set(key, {
      entity: obj,
      metadata: {
        entityName,
        depth,
        parentId,
        parentEntity,
        path,
      },
      originalState: this.deepClone(obj),
    });

    const propsToScan = obj.props || obj;

    for (const [propName, value] of Object.entries(propsToScan)) {
      if (propName === "id") continue;

      const propPath = path ? `${path}.${propName}` : propName;

      if (Array.isArray(value)) {
        this.captureArrayState(value, propPath, depth + 1, id, entityName);
      } else if (value instanceof Entity) {
        const nestedName = this.getEntityName(value);
        this.captureEntityState(
          value,
          nestedName,
          propPath,
          depth + 1,
          id,
          entityName
        );
      }
    }
  }

  private captureArrayState(
    arr: any[],
    path: string,
    depth: number,
    parentId?: string,
    parentEntity?: string
  ): void {
    const isPrimitive = this.isPrimitiveArray(arr);
    const entityName = arr.length > 0 ? this.getEntityName(arr[0]) : "Unknown";

    this.trackedArrays.set(path, {
      cloned: this.cloneArray(arr),
      original: arr.slice(),
      metadata: {
        entityName,
        depth,
        parentId,
        parentEntity,
        path,
      },
      isPrimitiveArray: isPrimitive,
    });

    // Only track individual items for non-primitive arrays
    if (!isPrimitive) {
      arr.forEach((item, index) => {
        if (item instanceof Entity) {
          const itemPath = `${path}[${index}]`;
          this.captureEntityState(
            item,
            this.getEntityName(item),
            itemPath,
            depth,
            parentId,
            parentEntity
          );
        }
      });
    }
  }

  createProxy(): any {
    const handler: ProxyHandler<any> = {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);

        if (this.shouldSkipProperty(prop)) {
          return value;
        }

        if (typeof value === "function") {
          return value.bind(target);
        }

        const currentPath = this.buildPath(String(prop));

        if (Array.isArray(value)) {
          return this.createArrayProxy(value, currentPath);
        }

        if (value instanceof Entity) {
          const nestedTracker = new ChangeTracker(
            value,
            this.getEntityName(value),
            currentPath,
            this.depth + 1,
            this.getEntityId(this.target),
            this.rootEntityName,
            this.rootTracker
          );
          return nestedTracker.createProxy();
        }

        return value;
      },

      set: (target, prop, newValue, receiver) => {
        const currentPath = this.buildPath(String(prop));
        const oldValue = Reflect.get(target, prop, receiver);

        if (!Array.isArray(newValue) && oldValue === newValue) {
          return true;
        }

        const rootTracker = this.getRootTracker();
        if (rootTracker.onChangeValidator) {
          try {
            const result = rootTracker.onChangeValidator(currentPath, newValue);
            if (result === false) {
              return true;
            }
          } catch (error) {
            throw error;
          }
        }

        if (!rootTracker.originalValues.has(currentPath)) {
          rootTracker.originalValues.set(currentPath, oldValue);
        }

        rootTracker.history.push({
          path: currentPath,
          previousValue: oldValue,
          currentValue: newValue,
          timestamp: Date.now(),
        });

        const result = Reflect.set(target, prop, newValue, receiver);

        if (Array.isArray(newValue)) {
          this.handleArrayAssignment(currentPath, oldValue);
        } else if (newValue instanceof Entity || oldValue instanceof Entity) {
          this.handleEntityChange(currentPath, oldValue, newValue);
        }

        return result;
      },
    };

    const proxy = new Proxy(this.target, handler);
    Object.defineProperty(proxy, "__isProxy", { value: true, writable: false });
    return proxy;
  }

  private createArrayProxy(array: any[], path: string): any[] {
    const tracker = this;
    const rootTracker = this.getRootTracker();

    if (!rootTracker.trackedArrays.has(path)) {
      const parentId = this.getEntityId(this.target);
      rootTracker.captureArrayState(
        array,
        path,
        this.depth + 1,
        parentId,
        this.rootEntityName
      );
    }

    return new Proxy(array, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        if (typeof value === "function") {
          const mutatingMethods = [
            "push",
            "pop",
            "shift",
            "unshift",
            "splice",
            "sort",
            "reverse",
          ];

          if (mutatingMethods.includes(String(prop))) {
            return function (...args: any[]) {
              const oldArray = target.slice();

              if (rootTracker.onChangeValidator) {
                try {
                  const result = rootTracker.onChangeValidator(path, [
                    ...oldArray,
                    ...args,
                  ]);
                  if (result === false) {
                    return undefined;
                  }
                } catch (error) {
                  throw error;
                }
              }

              const result = value.apply(target, args);

              rootTracker.history.push({
                path,
                previousValue: oldArray,
                currentValue: target.slice(),
                timestamp: Date.now(),
              });

              return result;
            };
          }
          return value.bind(target);
        }

        if (!isNaN(Number(prop)) && value instanceof Entity) {
          const nestedPath = `${path}[${String(prop)}]`;
          const nestedTracker = new ChangeTracker(
            value,
            tracker.getEntityName(value),
            nestedPath,
            tracker.depth + 1,
            tracker.getEntityId(tracker.target),
            tracker.rootEntityName,
            rootTracker
          );
          return nestedTracker.createProxy();
        }

        return value;
      },

      set(target, prop, newValue, receiver) {
        if (!isNaN(Number(prop))) {
          const oldArray = target.slice();

          if (rootTracker.onChangeValidator) {
            try {
              const result = rootTracker.onChangeValidator(path, newValue);
              if (result === false) {
                return true;
              }
            } catch (error) {
              throw error;
            }
          }

          const result = Reflect.set(target, prop, newValue, receiver);

          rootTracker.history.push({
            path,
            previousValue: oldArray,
            currentValue: target.slice(),
            timestamp: Date.now(),
          });

          return result;
        }
        return Reflect.set(target, prop, newValue, receiver);
      },
    });
  }

  /**
   * Returns all detected changes as AggregateChanges.
   */
  getChanges<TEntityMap = Record<string, any>>(): AggregateChanges<TEntityMap> {
    const changes = new AggregateChanges<TEntityMap>();
    const rootTracker = this.getRootTracker();

    // Collect all root-level changes (primitive fields + primitive arrays)
    const rootChangedFields = this.collectRootChanges(rootTracker);

    if (Object.keys(rootChangedFields).length > 0) {
      const id = this.getEntityId(this.target);
      if (id) {
        changes.addUpdate(
          this.rootEntityName,
          id,
          this.target,
          rootChangedFields,
          0
        );
      }
    }

    this.analyzeCollectionChanges(changes, rootTracker);
    this.analyzeEntityChanges(changes, rootTracker);

    return changes;
  }

  /**
   * Collects all root-level changes: primitive properties and primitive arrays.
   */
  private collectRootChanges(rootTracker: ChangeTracker): Record<string, any> {
    const changedFields: Record<string, any> = {};

    // Collect primitive property changes
    for (const [path, originalValue] of rootTracker.originalValues) {
      if (path.includes(".") || path.includes("[")) continue;

      const currentValue = this.target[path];

      if (!this.isEqual(originalValue, currentValue)) {
        changedFields[path] =
          currentValue instanceof ValueObject
            ? currentValue.value
            : currentValue;
      }
    }

    // Collect primitive array changes
    for (const [path, arrayState] of rootTracker.trackedArrays) {
      if (!arrayState.isPrimitiveArray) continue;
      if (path.includes(".")) continue; // Only root-level arrays

      const currentArray = this.getValueAtPath(this.target, path);
      if (!Array.isArray(currentArray)) continue;

      const originalArray = arrayState.cloned;

      if (!this.arraysEqual(originalArray, currentArray)) {
        changedFields[path] = currentArray.slice();
      }
    }

    return changedFields;
  }

  /**
   * Compares two arrays for equality (shallow comparison for primitives).
   */
  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private analyzeCollectionChanges(
    changes: AggregateChanges<any>,
    rootTracker: ChangeTracker
  ): void {
    const allTrackedArrays = new Map<string, ArrayState>();
    const processedArrays = new Set<any>();

    for (const [path, arrayState] of rootTracker.trackedArrays) {
      const currentArray = this.getValueAtPath(this.target, path);
      if (Array.isArray(currentArray) && !processedArrays.has(currentArray)) {
        allTrackedArrays.set(path, arrayState);
        processedArrays.add(currentArray);
      }
    }

    this.collectNestedArrays(
      this.target,
      "",
      allTrackedArrays,
      processedArrays
    );

    for (const [path, arrayState] of allTrackedArrays) {
      const currentArray = this.getValueAtPath(this.target, path);
      if (!Array.isArray(currentArray)) continue;

      // Skip primitive arrays - they are handled as root property changes
      if (arrayState.isPrimitiveArray) continue;

      const { created, updated, deleted } = this.detectArrayChanges(
        arrayState.cloned,
        arrayState.original,
        currentArray
      );

      const { depth, parentId, parentEntity } = arrayState.metadata;

      const relationField = this.extractRelationField(path);

      for (const item of created) {
        const itemEntityName = this.getEntityName(item);
        changes.addCreate(
          itemEntityName,
          item,
          depth,
          parentId,
          parentEntity,
          relationField
        );

        this.markNestedItemsAsCreated(item, depth, changes);
      }

      for (const item of updated) {
        const id = this.getEntityId(item);
        if (id) {
          const original = arrayState.cloned.find(
            (o) => this.getEntityId(o) === id
          );
          const changedFields = this.detectChangedFields(original, item);
          if (Object.keys(changedFields).length > 0) {
            const itemEntityName = this.getEntityName(item);
            changes.addUpdate(itemEntityName, id, item, changedFields, depth);
          }
        }
      }

      for (const item of deleted) {
        const id = this.getEntityId(item);
        const key = this.getItemKey(item);
        if (id || key) {
          const itemEntityName = this.getEntityName(item);
          const deleteId = id || key!;
          changes.addDelete(
            itemEntityName,
            deleteId,
            item,
            depth,
            relationField,
            parentId,
            parentEntity
          );

          this.markNestedItemsAsDeleted(item, depth, changes, rootTracker);
        }
      }
    }
  }

  /**
   * Recursively marks all nested items as created when a parent is created.
   */
  private markNestedItemsAsCreated(
    item: any,
    parentDepth: number,
    changes: AggregateChanges<any>
  ): void {
    if (!item || typeof item !== "object") return;

    const propsToScan = item.props || item;
    const parentId = this.getEntityId(item);
    const parentEntity = this.getEntityName(item);

    for (const [propName, value] of Object.entries(propsToScan)) {
      if (propName === "id") continue;

      if (Array.isArray(value)) {
        const relationField = propName;

        for (const child of value) {
          if (child instanceof Entity) {
            const childEntityName = this.getEntityName(child);
            changes.addCreate(
              childEntityName,
              child,
              parentDepth + 1,
              parentId,
              parentEntity,
              relationField
            );
            this.markNestedItemsAsCreated(child, parentDepth + 1, changes);
          }
        }
      } else if (value instanceof Entity) {
        const childEntityName = this.getEntityName(value);
        changes.addCreate(
          childEntityName,
          value,
          parentDepth + 1,
          parentId,
          parentEntity,
          propName
        );
        this.markNestedItemsAsCreated(value, parentDepth + 1, changes);
      }
    }
  }

  /**
   * Recursively marks all nested items as deleted when a parent is deleted.
   * Uses the original captured state to find nested items.
   */
  private markNestedItemsAsDeleted(
    item: any,
    parentDepth: number,
    changes: AggregateChanges<any>,
    rootTracker: ChangeTracker
  ): void {
    if (!item || typeof item !== "object") return;

    const itemId = this.getEntityId(item);
    if (!itemId) return;

    for (const [path, arrayState] of rootTracker.trackedArrays) {
      if (arrayState.metadata.parentId === itemId) {
        const relationField = this.extractRelationField(path);
        const parentEntity = arrayState.metadata.parentEntity;
        const parentId = arrayState.metadata.parentId;

        for (const nestedItem of arrayState.cloned) {
          const id =
            typeof nestedItem === "object" && nestedItem !== null
              ? nestedItem.id
              : undefined;
          if (id) {
            const entityName = arrayState.metadata.entityName;
            changes.addDelete(
              entityName,
              id,
              nestedItem,
              parentDepth + 1,
              relationField,
              parentEntity,
              parentId
            );

            this.markNestedJsonItemAsDeleted(
              id,
              parentDepth + 1,
              changes,
              rootTracker
            );
          }
        }
      }
    }
  }

  /**
   * Recursively marks nested items as deleted from a JSON object.
   * This is used when processing cloned (JSON) state.
   */
  private markNestedJsonItemAsDeleted(
    itemId: string,
    parentDepth: number,
    changes: AggregateChanges<any>,
    rootTracker: ChangeTracker
  ): void {
    for (const [path, arrayState] of rootTracker.trackedArrays) {
      if (arrayState.metadata.parentId === itemId) {
        const relationField = this.extractRelationField(path);

        for (const nestedJsonItem of arrayState.cloned) {
          if (typeof nestedJsonItem !== "object" || nestedJsonItem === null)
            continue;

          const nestedId = nestedJsonItem.id;
          const entityName = arrayState.metadata.entityName;
          const parentEntity = arrayState.metadata.parentEntity;
          const parentId = arrayState.metadata.parentId;

          if (nestedId) {
            changes.addDelete(
              entityName,
              nestedId,
              nestedJsonItem,
              parentDepth + 1,
              relationField,
              parentId,
              parentEntity
            );

            this.markNestedJsonItemAsDeleted(
              nestedId,
              parentDepth + 1,
              changes,
              rootTracker
            );
          } else {
            const key = this.extractIdentityKeyFromJson(
              nestedJsonItem,
              arrayState.original
            );
            if (key) {
              changes.addDelete(
                entityName,
                key,
                nestedJsonItem,
                parentDepth + 1,
                relationField,
                parentId,
                parentEntity
              );
            }
          }
        }
      }
    }
  }

  /**
   * Extracts identity key from a JSON object by looking at the original Entity instances.
   */
  private extractIdentityKeyFromJson(
    jsonItem: any,
    originalArray: any[]
  ): string | undefined {
    for (const originalItem of originalArray) {
      if (originalItem instanceof Entity) {
        const originalJson = this.deepClone(originalItem);
        if (JSON.stringify(originalJson) === JSON.stringify(jsonItem)) {
          const key = this.getItemKey(originalItem);
          if (key) return key;
        }
      }
    }

    if (jsonItem.id) return jsonItem.id;

    return undefined;
  }

  private collectNestedArrays(
    obj: any,
    basePath: string,
    allArrays: Map<string, ArrayState>,
    processedArrays: Set<any>
  ): void {
    if (!obj || typeof obj !== "object") return;

    for (const [propName, value] of Object.entries(obj)) {
      if (propName === "id" || propName === "proxy" || propName === "_props")
        continue;

      const propPath = basePath ? `${basePath}.${propName}` : propName;

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item instanceof Entity) {
            this.collectNestedArrays(
              item,
              `${propPath}[${index}]`,
              allArrays,
              processedArrays
            );
          }
        });
      } else if (value instanceof Entity) {
        this.collectNestedArrays(value, propPath, allArrays, processedArrays);
      }
    }
  }

  private analyzeEntityChanges(
    changes: AggregateChanges<any>,
    rootTracker: ChangeTracker
  ): void {
    for (const [path, trackedItem] of rootTracker.trackedEntities) {
      if (path === "root") continue;
      if (path.includes("[")) continue;

      const currentValue = this.getValueAtPath(this.target, path);
      const originalValue = trackedItem.originalState;
      const originalEntity = trackedItem.entity;
      const { entityName, depth, parentId, parentEntity } =
        trackedItem.metadata;

      const relationField = this.extractRelationField(path);

      const state = this.detectEntityChangeState(originalValue, currentValue);

      switch (state) {
        case "created":
          changes.addCreate(
            entityName,
            currentValue,
            depth,
            parentId,
            parentEntity,
            relationField
          );
          break;

        case "deleted":
          const id = this.getEntityId(originalValue);
          if (id) {
            changes.addDelete(
              entityName,
              id,
              originalEntity,
              depth,
              relationField,
              parentId,
              parentEntity
            );
          }
          break;

        case "replaced":
          const oldId = this.getEntityId(originalValue);
          if (oldId) {
            changes.addDelete(
              entityName,
              oldId,
              originalEntity,
              depth,
              relationField,
              parentId,
              parentEntity
            );
          }
          changes.addCreate(
            entityName,
            currentValue,
            depth,
            parentId,
            parentEntity,
            relationField
          );
          break;

        case "updated":
          const updateId = this.getEntityId(currentValue);
          if (updateId) {
            const changedFields = this.detectChangedFields(
              originalValue,
              currentValue
            );
            if (Object.keys(changedFields).length > 0) {
              changes.addUpdate(
                entityName,
                updateId,
                currentValue,
                changedFields,
                depth
              );
            }
          }
          break;
      }
    }
  }

  private detectEntityChangeState(
    previous: any,
    current: any
  ): EntityChangeState {
    if (previous === null && current !== null) {
      return "created";
    }

    if (previous !== null && current === null) {
      return "deleted";
    }

    if (previous !== null && current !== null) {
      const prevId = this.getEntityId(previous);
      const currId = this.getEntityId(current);

      if (prevId && currId && prevId === currId) {
        return this.hasChanged(previous, current) ? "updated" : "unchanged";
      } else {
        return "replaced";
      }
    }

    return "unchanged";
  }

  private detectArrayChanges(
    oldCloned: any[],
    oldOriginal: any[],
    newArray: any[]
  ): { created: any[]; updated: any[]; deleted: any[] } {
    const created: any[] = [];
    const updated: any[] = [];
    const deleted: any[] = [];

    const oldMap = new Map<string, any>();
    const newMap = new Map<string, any>();

    oldCloned.forEach((item) => {
      const key = this.getItemKey(item);
      if (key) oldMap.set(key, item);
    });

    newArray.forEach((item) => {
      const key = this.getItemKey(item);
      if (key) newMap.set(key, item);
    });

    newArray.forEach((item) => {
      const key = this.getItemKey(item);
      if (!key) {
        created.push(item);
      } else if (!oldMap.has(key)) {
        created.push(item);
      } else if (this.hasChanged(oldMap.get(key), item)) {
        updated.push(item);
      }
    });

    oldOriginal.forEach((item) => {
      const key = this.getItemKey(item);
      if (key && !newMap.has(key)) {
        deleted.push(item);
      }
    });

    return { created, updated, deleted };
  }

  private detectChangedFields(
    original: any,
    current: any
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    if (!original || !current) return changes;

    const origProps = original.props || original;
    const currProps = current.props || current;

    for (const key of Object.keys(currProps)) {
      if (key === "id") continue;

      const origValue = origProps[key];
      const currValue = currProps[key];

      if (Array.isArray(currValue) || currValue instanceof Entity) {
        continue;
      }

      if (!this.isEqual(origValue, currValue)) {
        changes[key] =
          currValue instanceof ValueObject ? currValue.value : currValue;
      }
    }

    return changes;
  }

  private handleArrayAssignment(path: string, oldValue: any): void {
    const rootTracker = this.getRootTracker();

    if (!rootTracker.trackedArrays.has(path)) {
      const parentId = this.getEntityId(this.target);
      rootTracker.captureArrayState(
        Array.isArray(oldValue) ? oldValue : [],
        path,
        this.depth + 1,
        parentId,
        this.rootEntityName
      );
    }
  }

  private handleEntityChange(path: string, oldValue: any, newValue: any): void {
    const rootTracker = this.getRootTracker();
    const entityName = newValue
      ? this.getEntityName(newValue)
      : this.getEntityName(oldValue);

    const existingTracked = rootTracker.trackedEntities.get(path);

    rootTracker.trackedEntities.set(path, {
      entity: existingTracked?.entity || oldValue,
      metadata: {
        entityName,
        depth: this.depth + 1,
        parentId: this.getEntityId(this.target),
        parentEntity: this.rootEntityName,
        path,
      },
      originalState: existingTracked?.originalState,
    });
  }

  private getRootTracker(): ChangeTracker {
    return this.rootTracker || this;
  }

  private buildPath(prop: string): string {
    return this.path ? `${this.path}.${prop}` : prop;
  }

  private shouldSkipProperty(prop: string | symbol): boolean {
    const skipProps = [
      "__isProxy",
      "__tracker",
      "__originalTarget",
      "__path",
      "constructor",
      "prototype",
    ];
    return skipProps.includes(String(prop));
  }

  private getValueAtPath(obj: any, path: string): any {
    if (!path) return obj;

    const parts = path.split(/[.\[\]]+/).filter(Boolean);
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;

      const propsToAccess = current.props || current;
      current = propsToAccess[part];
    }

    return current;
  }

  private extractRelationField(path: string): string {
    const withoutIndices = path.replace(/\[\d+\]/g, "");
    const parts = withoutIndices.split(".");
    return parts[parts.length - 1];
  }

  private getItemKey(item: any): string | undefined {
    const id = this.getEntityId(item);
    if (id) return id;

    return undefined;
  }

  private getEntityId(item: any): string | undefined {
    if (!item) return undefined;
    if (item.id instanceof Id) return item.id.value;
    if (item.id !== undefined) return String(item.id);
    return undefined;
  }

  private getEntityName(item: any): string {
    if (!item) return "Unknown";
    return item.constructor?.name || "Unknown";
  }

  /**
   * Checks if a value is a primitive (string, number, boolean, null, undefined, symbol, bigint).
   */
  private isPrimitiveValue(value: any): boolean {
    if (value === null || value === undefined) return true;
    const type = typeof value;
    return type === "string" || type === "number" || type === "boolean" || type === "symbol" || type === "bigint";
  }

  /**
   * Checks if an array contains only primitive values.
   */
  private isPrimitiveArray(arr: any[]): boolean {
    if (arr.length === 0) return false; // Empty arrays are not treated as primitive arrays
    return arr.every(item => this.isPrimitiveValue(item));
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a instanceof Id && b instanceof Id) return a.equals(b);
    if (a instanceof ValueObject && b instanceof ValueObject)
      return a.equals(b);
    if (a instanceof Date && b instanceof Date)
      return a.getTime() === b.getTime();

    try {
      return this.hasChanged(a, b) === false;
    } catch {
      return this.deepEqual(a, b);
    }
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return a === b;

    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a).filter((key) => {
      const value = a[key];
      return (
        typeof value !== "object" ||
        value instanceof Date ||
        value instanceof Id ||
        value === null
      );
    });
    const keysB = Object.keys(b).filter((key) => {
      const value = b[key];
      return (
        typeof value !== "object" ||
        value instanceof Date ||
        value instanceof Id ||
        value === null
      );
    });

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.isEqual(a[key], b[key])) return false;
    }

    return true;
  }

  private hasChanged(obj1: any, obj2: any): boolean {
    const json1 = this.normalizeAndStringify(this.deepClone(obj1));
    const json2 = this.normalizeAndStringify(this.deepClone(obj2));
    return json1 !== json2;
  }

  private cloneArray(arr: any[]): any[] {
    return arr.map((item) => this.deepClone(item));
  }

  private deepClone(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Id) {
      return obj.value;
    }

    if (obj instanceof ValueObject) {
      return obj.value;
    }

    if (typeof obj.toJSON === "function") {
      return obj.toJSON();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item));
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    try {
      return structuredClone(obj);
    } catch {
      const cloned: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
  }

  private normalizeAndStringify(obj: any): string {
    if (obj === null || typeof obj !== "object") {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return `[${obj
        .map((item) => this.normalizeAndStringify(item))
        .join(",")}]`;
    }

    const keys = Object.keys(obj).sort();
    const parts = keys.map(
      (key) => `"${key}":${this.normalizeAndStringify(obj[key])}`
    );
    return `{${parts.join(",")}}`;
  }

  getHistory(): HistoryEntry[] {
    return [...this.getRootTracker().history];
  }

  clearHistory(): void {
    const rootTracker = this.getRootTracker();
    rootTracker.history = [];
    rootTracker.originalValues.clear();
    rootTracker.trackedArrays.clear();
    rootTracker.trackedEntities.clear();
    this.captureInitialState();
  }

  markAsClean(): void {
    this.clearHistory();
  }

  getTarget(): any {
    return this.target;
  }
}
