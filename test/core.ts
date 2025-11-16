// ============================================================================
// Types & Interfaces
// ============================================================================

export type EntityId = string | number;

export interface BaseProps {
  id: EntityId;
}

export interface ChangeEvent<T> {
  previous: T | undefined;
  current: T;
  path: string;
}

export interface ArrayChangeEvent<T> {
  toCreate: T[];
  toUpdate: T[];
  toDelete: T[];
  path: string;
}

export type PropertySubscriber<T> = (event: ChangeEvent<T>) => void;
export type ArraySubscriber<T> = (event: ArrayChangeEvent<T>) => void;

export interface PropertySubscription {
  onChange: PropertySubscriber<any>;
}

export interface ArraySubscription<T> {
  onChange: ArraySubscriber<T>;
}

export type SubscriptionConfig<T extends BaseProps> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? ArraySubscription<U>
    : T[K] extends BaseEntity<any>
    ? PropertySubscription
    : PropertySubscription;
};

// ============================================================================
// History Tracking
// ============================================================================

interface HistoryEntry {
  path: string;
  previousValue: any;
  currentValue: any;
  timestamp: number;
}

class DeepProxy {
  private history: HistoryEntry[] = [];
  private subscribers: Map<string, Set<Function>> = new Map();
  private originalValues: Map<string, any> = new Map();
  private trackedArrays: Map<string, any[]> = new Map();

  constructor(
    private target: any,
    private path: string = '',
    private rootProxy?: DeepProxy
  ) {
    if (!rootProxy) {
      this.rootProxy = this;
    }
  }

  createProxy(): any {
    const handler: ProxyHandler<any> = {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);
        const currentPath = this.path
          ? `${this.path}.${String(prop)}`
          : String(prop);

        // Skip internal properties
        if (
          prop === '__isProxy' ||
          prop === '__originalTarget' ||
          prop === '__path' ||
          prop === 'constructor' ||
          prop === 'prototype'
        ) {
          return value;
        }

        // Handle methods
        if (typeof value === 'function') {
          return value.bind(target);
        }

        // Track arrays - save initial state only once
        if (Array.isArray(value)) {
          if (!this.rootProxy!.trackedArrays.has(currentPath)) {
            // Save the INITIAL state for accumulative comparison
            this.rootProxy!.trackedArrays.set(
              currentPath,
              this.cloneArray(value)
            );
          }
          return this.createArrayProxy(value, currentPath);
        }

        // Track objects (including entities)
        if (value && typeof value === 'object' && !value.__isProxy) {
          const nestedProxy = new DeepProxy(value, currentPath, this.rootProxy);
          return nestedProxy.createProxy();
        }

        return value;
      },

      set: (target, prop, newValue, receiver) => {
        const currentPath = this.path
          ? `${this.path}.${String(prop)}`
          : String(prop);
        const oldValue = Reflect.get(target, prop, receiver);

        // For arrays, always check even if reference is the same
        const isArrayAssignment = Array.isArray(newValue);

        // Skip if value hasn't changed (except for arrays)
        if (!isArrayAssignment && oldValue === newValue) {
          return true;
        }

        // Store original value on first change
        if (!this.rootProxy!.originalValues.has(currentPath)) {
          this.rootProxy!.originalValues.set(currentPath, oldValue);
        }

        // Record history
        this.rootProxy!.history.push({
          path: currentPath,
          previousValue: oldValue,
          currentValue: newValue,
          timestamp: Date.now(),
        });

        // Set the new value
        const result = Reflect.set(target, prop, newValue, receiver);

        // Check if this is an array property
        if (isArrayAssignment) {
          // Initialize tracked array if this is the first assignment
          if (!this.rootProxy!.trackedArrays.has(currentPath)) {
            // For first assignment, use oldValue as initial state if it was an array
            if (Array.isArray(oldValue)) {
              this.rootProxy!.trackedArrays.set(
                currentPath,
                this.cloneArray(oldValue)
              );
            } else {
              // Otherwise this shouldn't happen, but use empty array as fallback
              this.rootProxy!.trackedArrays.set(currentPath, []);
            }
          }

          const trackedArray = this.rootProxy!.trackedArrays.get(currentPath)!;
          // Always notify with comparison to INITIAL tracked array
          this.rootProxy!.notifyArrayChange(
            currentPath,
            trackedArray,
            newValue
          );
        } else {
          // Notify subscribers for non-array properties
          this.rootProxy!.notifySubscribers(currentPath, oldValue, newValue);
        }

        return result;
      },
    };

    const proxy = new Proxy(this.target, handler);
    Object.defineProperty(proxy, '__isProxy', { value: true, writable: false });
    Object.defineProperty(proxy, '__originalTarget', {
      value: this.target,
      writable: false,
    });
    Object.defineProperty(proxy, '__path', {
      value: this.path,
      writable: false,
    });

    return proxy;
  }

  private cloneArray(arr: any[]): any[] {
    return arr.map(item => this.deepClone(item));
  }

  private deepClone(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());

    // Handle entities - extract their data
    if (obj.toJson && typeof obj.toJson === 'function') {
      return obj.toJson();
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  private createArrayProxy(array: any[], path: string): any[] {
    const self = this;

    return new Proxy(array, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        // Intercept mutating methods
        if (typeof value === 'function') {
          const mutatingMethods = [
            'push',
            'pop',
            'shift',
            'unshift',
            'splice',
            'sort',
            'reverse',
          ];

          if (mutatingMethods.includes(String(prop))) {
            return function(...args: any[]) {
              const result = value.apply(target, args);

              // Get or set the INITIAL tracked array
              if (!self.rootProxy!.trackedArrays.has(path)) {
                self.rootProxy!.trackedArrays.set(
                  path,
                  self.cloneArray(target)
                );
              }

              const initialTrackedArray = self.rootProxy!.trackedArrays.get(
                path
              )!;

              // Notify with comparison against initial state
              self.rootProxy!.notifyArrayChange(
                path,
                initialTrackedArray,
                target
              );

              return result;
            };
          }

          return value.bind(target);
        }

        // Wrap nested objects
        if (typeof value === 'object' && value !== null && !value.__isProxy) {
          const nestedPath = `${path}[${String(prop)}]`;
          const nestedProxy = new DeepProxy(value, nestedPath, self.rootProxy);
          return nestedProxy.createProxy();
        }

        return value;
      },

      set(target, prop, newValue, receiver) {
        const isNumericIndex = !isNaN(Number(prop));

        if (isNumericIndex) {
          const result = Reflect.set(target, prop, newValue, receiver);

          // Get or set the INITIAL tracked array
          if (!self.rootProxy!.trackedArrays.has(path)) {
            self.rootProxy!.trackedArrays.set(path, self.cloneArray(target));
          }

          const initialTrackedArray = self.rootProxy!.trackedArrays.get(path)!;
          self.rootProxy!.notifyArrayChange(path, initialTrackedArray, target);

          return result;
        }

        return Reflect.set(target, prop, newValue, receiver);
      },
    });
  }

  subscribe(path: string, callback: Function): void {
    if (!this.rootProxy!.subscribers.has(path)) {
      this.rootProxy!.subscribers.set(path, new Set());
    }
    this.rootProxy!.subscribers.get(path)!.add(callback);

    // IMPORTANT: When subscribing to an array property, ensure we have the initial state tracked
    // This handles the case where the property was accessed before subscribing
    const target = this.target as any;
    const value = target[path];

    if (Array.isArray(value) && !this.rootProxy!.trackedArrays.has(path)) {
      // Get the actual current value from the target (before any proxying)
      const actualValue = this.rootProxy!.target[path];
      if (Array.isArray(actualValue)) {
        this.rootProxy!.trackedArrays.set(path, this.cloneArray(actualValue));
      }
    }
  }

  private notifySubscribers(path: string, oldValue: any, newValue: any): void {
    const subscribers = this.subscribers.get(path);
    if (subscribers) {
      subscribers.forEach(callback => {
        callback({
          previous: oldValue,
          current: newValue,
          path,
        });
      });
    }
  }

  private notifyArrayChange(
    path: string,
    oldArray: any[],
    newArray: any[]
  ): void {
    oldArray;
    const subscribers = this.subscribers.get(path);
    if (!subscribers) return;

    // Get the INITIAL tracked array for accumulative comparison
    const initialTrackedArray = this.trackedArrays.get(path);

    if (!initialTrackedArray) {
      // First time - just store and notify if needed
      this.trackedArrays.set(path, this.cloneArray(newArray));
      return;
    }

    // Always compare against the INITIAL state for accumulative behavior
    const changes = this.detectArrayChanges(initialTrackedArray, newArray);

    subscribers.forEach(callback => {
      callback({
        ...changes,
        path,
      });
    });

    // DON'T update tracked array - keep initial state for accumulative behavior
    // Only reset on clearHistory()
  }

  private detectArrayChanges(
    oldArray: any[],
    newArray: any[]
  ): {
    toCreate: any[];
    toUpdate: any[];
    toDelete: any[];
  } {
    const toCreate: any[] = [];
    const toUpdate: any[] = [];
    const toDelete: any[] = [];

    // Create maps of old and new items by ID
    const oldMap = new Map<EntityId, any>();
    const newMap = new Map<EntityId, any>();

    oldArray.forEach(item => {
      const id = this.getItemId(item);
      if (id !== undefined) {
        oldMap.set(id, item);
      }
    });

    newArray.forEach(item => {
      const id = this.getItemId(item);
      if (id !== undefined) {
        newMap.set(id, item);
      }
    });

    // Detect creates and updates
    newArray.forEach(item => {
      const id = this.getItemId(item);

      if (id === undefined) {
        toCreate.push(this.unwrapEntity(item));
      } else if (!oldMap.has(id)) {
        toCreate.push(this.unwrapEntity(item));
      } else if (this.hasChanged(oldMap.get(id), item)) {
        toUpdate.push(this.unwrapEntity(item));
      }
    });

    // Detect deletes
    oldArray.forEach(item => {
      const id = this.getItemId(item);
      if (id !== undefined && !newMap.has(id)) {
        toDelete.push(this.unwrapEntity(item));
      }
    });

    return { toCreate, toUpdate, toDelete };
  }

  private unwrapEntity(item: any): any {
    // If it's an entity/aggregate with props, return the actual entity object
    if (item && typeof item === 'object' && '__originalTarget' in item) {
      return item;
    }
    return item;
  }

  private getItemId(item: any): EntityId | undefined {
    if (!item) return undefined;

    // Check for Entity instances
    if (item.id !== undefined) {
      return item.id;
    }

    // Check for plain objects with id
    if (typeof item === 'object' && 'id' in item) {
      return item.id;
    }

    return undefined;
  }

  private hasChanged(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return false;

    const json1 = this.deepClone(obj1);
    const json2 = this.deepClone(obj2);

    return JSON.stringify(json1) !== JSON.stringify(json2);
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    this.originalValues.clear();
  }
}

// ============================================================================
// Base Entity Class
// ============================================================================

export abstract class BaseEntity<T extends BaseProps> {
  protected props: T;
  private proxy: DeepProxy;
  private proxiedProps: T;

  constructor(props: T) {
    this.props = { ...props };
    this.proxy = new DeepProxy(this.props);
    this.proxiedProps = this.proxy.createProxy();
  }

  get id(): EntityId {
    return this.props.id;
  }

  protected get properties(): T {
    return this.proxiedProps;
  }

  subscribe(config: SubscriptionConfig<T>): void {
    Object.keys(config).forEach(key => {
      const subscription = config[key as keyof T];
      if (subscription && 'onChange' in subscription) {
        this.proxy.subscribe(key, subscription.onChange);
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
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepToJson(item));
    }

    // Handle entities
    if (obj instanceof BaseEntity) {
      return obj.toJson();
    }

    // Handle value objects
    if (obj && typeof obj.toJson === 'function') {
      return obj.toJson();
    }

    // Handle objects
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = this.deepToJson(obj[key]);
        }
      }
      return result;
    }

    // Primitives
    return obj;
  }
}

// ============================================================================
// Entity & Aggregate Classes
// ============================================================================

export class Entity<T extends BaseProps> extends BaseEntity<T> {}

export class Aggregate<T extends BaseProps> extends BaseEntity<T> {}

// ============================================================================
// Value Object
// ============================================================================

export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof ValueObject)) {
      return false;
    }

    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  toJson(): T {
    return { ...this.props };
  }
}

// ============================================================================
// Type Helpers for toJson
// ============================================================================

type DeepJsonResult<T> = {
  [K in keyof T]: T[K] extends BaseEntity<infer U>
    ? DeepJsonResult<U>
    : T[K] extends Array<infer U>
    ? U extends BaseEntity<infer V>
      ? DeepJsonResult<V>[]
      : U[]
    : T[K] extends ValueObject<infer V>
    ? V
    : T[K];
};
