// ============================================================================
// Deep Proxy - Core Change Tracking
// ============================================================================

import { Id } from "./id";
import { HistoryEntry } from "./types";

export class DeepProxy {
  private history: HistoryEntry[] = [];
  private subscribers: Map<string, Set<Function>> = new Map();
  private originalValues: Map<string, any> = new Map();
  private trackedArraysCloned: Map<string, any[]> = new Map();
  private trackedArraysOriginal: Map<string, any[]> = new Map();
  private globalSubscribers: Set<Function> = new Set();
  private updateInProgress: boolean = false;
  private pendingNotifications: Array<() => void> = [];

  constructor(
    private target: any,
    private path: string = "",
    private rootProxy?: DeepProxy
  ) {
    if (!rootProxy) this.rootProxy = this;
  }

  createProxy(): any {
    const handler: ProxyHandler<any> = {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);
        if (!this.rootProxy) throw new Error("Root proxy is required");

        const currentPath = this.path
          ? `${this.path}.${String(prop)}`
          : String(prop);

        if (
          prop === "__isProxy" ||
          prop === "__originalTarget" ||
          prop === "__path" ||
          prop === "constructor" ||
          prop === "prototype"
        ) {
          return value;
        }

        if (typeof value === "function") return value.bind(target);

        if (Array.isArray(value)) {
          if (!this.rootProxy.trackedArraysCloned.has(currentPath)) {
            this.rootProxy.storeArrayState(currentPath, value);
          }
          return this.createArrayProxy(value, currentPath);
        }

        if (value && typeof value === "object" && !value.__isProxy) {
          const nestedProxy = new DeepProxy(value, currentPath, this.rootProxy);
          return nestedProxy.createProxy();
        }

        return value;
      },

      set: (target, prop, newValue, receiver) => {
        const currentPath = this.path
          ? `${this.path}.${String(prop)}`
          : String(prop);
        if (!this.rootProxy) throw new Error("Root proxy is required");

        const oldValue = Reflect.get(target, prop, receiver);
        const isArrayAssignment = Array.isArray(newValue);

        if (!isArrayAssignment && oldValue === newValue) return true;

        if (!this.rootProxy.originalValues.has(currentPath)) {
          this.rootProxy.originalValues.set(currentPath, oldValue);
        }

        this.rootProxy.history.push({
          path: currentPath,
          previousValue: oldValue,
          currentValue: newValue,
          timestamp: Date.now(),
        });

        const result = Reflect.set(target, prop, newValue, receiver);

        if (isArrayAssignment) {
          if (!this.rootProxy.trackedArraysCloned.has(currentPath)) {
            if (Array.isArray(oldValue)) {
              this.rootProxy.storeArrayState(currentPath, oldValue);
            } else {
              this.rootProxy.storeArrayState(currentPath, []);
            }
          }
          this.rootProxy.scheduleNotification(() =>
            this.rootProxy!.notifyArrayChange(currentPath, newValue)
          );
        } else {
          this.rootProxy.scheduleNotification(() =>
            this.rootProxy!.notifySubscribers(currentPath, oldValue, newValue)
          );
        }

        // Notify global subscribers
        this.rootProxy.scheduleNotification(() =>
          this.rootProxy!.notifyGlobalSubscribers()
        );

        this.rootProxy.flushNotifications();

        return result;
      },
    };

    const proxy = new Proxy(this.target, handler);
    Object.defineProperty(proxy, "__isProxy", { value: true, writable: false });
    return proxy;
  }

  private scheduleNotification(notification: () => void): void {
    this.pendingNotifications.push(notification);
  }

  private flushNotifications(): void {
    if (this.updateInProgress) return;

    this.updateInProgress = true;
    try {
      const notifications = [...this.pendingNotifications];
      this.pendingNotifications = [];
      notifications.forEach((notify) => notify());
    } finally {
      this.updateInProgress = false;
    }
  }

  private storeArrayState(path: string, arr: any[]): void {
    this.trackedArraysCloned.set(path, this.cloneArray(arr));
    this.trackedArraysOriginal.set(path, arr.slice());
  }

  private createArrayProxy(array: any[], path: string): any[] {
    const self = this;
    return new Proxy(array, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (!self.rootProxy) throw new Error("Root proxy is required");

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
              // Capture state before mutation
              if (!self.rootProxy) throw new Error("Root proxy is required");
              const oldArray = target.slice();

              const result = value.apply(target, args);

              // Add to history
              self.rootProxy.history.push({
                path: path,
                previousValue: oldArray,
                currentValue: target.slice(),
                timestamp: Date.now(),
              });

              if (!self.rootProxy.trackedArraysCloned.has(path)) {
                self.rootProxy.storeArrayState(path, target);
              }
              self.rootProxy.notifyArrayChange(path, target);
              self.rootProxy.notifyGlobalSubscribers();
              return result;
            };
          }
          return value.bind(target);
        }
        if (typeof value === "object" && value !== null && !value.__isProxy) {
          const nestedPath = `${path}[${String(prop)}]`;
          const nestedProxy = new DeepProxy(value, nestedPath, self.rootProxy);
          return nestedProxy.createProxy();
        }
        return value;
      },
      set(target, prop, newValue, receiver) {
        if (!isNaN(Number(prop))) {
          if (!self.rootProxy) throw new Error("Root proxy is required");
          // Capture state before change
          const oldArray = target.slice();

          const result = Reflect.set(target, prop, newValue, receiver);

          // Add to history
          self.rootProxy.history.push({
            path: path,
            previousValue: oldArray,
            currentValue: target.slice(),
            timestamp: Date.now(),
          });

          if (!self.rootProxy.trackedArraysCloned.has(path)) {
            self.rootProxy.storeArrayState(path, target);
          }
          self.rootProxy.notifyArrayChange(path, target);
          self.rootProxy.notifyGlobalSubscribers();
          return result;
        }
        return Reflect.set(target, prop, newValue, receiver);
      },
    });
  }

  subscribe(path: string, callback: Function): void {
    if (!this.rootProxy) throw new Error("Root proxy is required");

    if (path === "*") {
      this.rootProxy.globalSubscribers.add(callback);
      return;
    }

    if (!this.rootProxy.subscribers.has(path)) {
      this.rootProxy.subscribers.set(path, new Set());
    }

    this.rootProxy.subscribers.get(path)!.add(callback);

    const actualValue = this.rootProxy.target[path];
    const isArray = Array.isArray(actualValue);

    // Fire callback immediately if there's a historical change for this path
    const lastChange = this.rootProxy.getLastChangeForPath(path);
    if (lastChange) {
      if (isArray) {
        // For arrays, we need to detect changes and fire with toCreate/toUpdate/toDelete
        const previousArray = Array.isArray(lastChange.previousValue)
          ? lastChange.previousValue
          : [];
        const currentArray = Array.isArray(lastChange.currentValue)
          ? lastChange.currentValue
          : actualValue;

        // Store the initial state before the change for comparison
        if (!this.rootProxy.trackedArraysCloned.has(path)) {
          this.rootProxy.storeArrayState(path, previousArray);
        }

        // Detect changes between previous and current
        const changes = this.rootProxy.detectArrayChanges(
          this.rootProxy.trackedArraysCloned.get(path) ||
            this.rootProxy.cloneArray(previousArray),
          previousArray,
          currentArray
        );

        callback({ ...changes, path });

        // Update tracked state to current
        this.rootProxy.storeArrayState(path, currentArray);
      } else {
        // For non-arrays, use the simple property change format
        callback({
          previous: lastChange.previousValue,
          current: lastChange.currentValue,
          path: lastChange.path,
        });
      }
    } else if (isArray && !this.rootProxy.trackedArraysCloned.has(path)) {
      // No historical changes, just store initial state
      this.rootProxy.storeArrayState(path, actualValue);
    }
  }

  unsubscribe(path: string, callback: Function): void {
    if (!this.rootProxy) throw new Error("Root proxy is required");
    if (path === "*") {
      this.rootProxy.globalSubscribers.delete(callback);
      return;
    }

    const subs = this.rootProxy.subscribers.get(path);
    if (subs) {
      subs.delete(callback);
    }
  }

  private notifySubscribers(path: string, oldValue: any, newValue: any): void {
    const subs = this.subscribers.get(path);
    if (subs) {
      subs.forEach((cb) => cb({ previous: oldValue, current: newValue, path }));
    }
  }

  private notifyGlobalSubscribers(): void {
    this.globalSubscribers.forEach((cb) => cb());
  }

  private notifyArrayChange(path: string, newArray: any[]): void {
    const subs = this.subscribers.get(path);
    if (!subs) return;

    const clonedInitial = this.trackedArraysCloned.get(path);
    const originalInitial = this.trackedArraysOriginal.get(path);

    if (!clonedInitial || !originalInitial) {
      this.storeArrayState(path, newArray);
      return;
    }

    const changes = this.detectArrayChanges(
      clonedInitial,
      originalInitial,
      newArray
    );
    subs.forEach((cb) => cb({ ...changes, path }));
  }

  private detectArrayChanges(
    oldCloned: any[],
    oldOriginal: any[],
    newArray: any[]
  ): { toCreate: any[]; toUpdate: any[]; toDelete: any[] } {
    const toCreate: any[] = [];
    const toUpdate: any[] = [];
    const toDelete: any[] = [];

    const oldMap = new Map<string, any>();
    const newMap = new Map<string, any>();

    oldCloned.forEach((item) => {
      const id = this.getItemId(item);
      if (id) oldMap.set(id, item);
    });

    newArray.forEach((item) => {
      const id = this.getItemId(item);
      if (id) newMap.set(id, item);
    });

    newArray.forEach((item) => {
      const id = this.getItemId(item);
      if (!id) {
        toCreate.push(item);
      } else if (!oldMap.has(id)) {
        toCreate.push(item);
      } else if (this.hasChanged(oldMap.get(id), item)) {
        toUpdate.push(item);
      }
    });

    oldOriginal.forEach((item) => {
      const id = this.getItemId(item);
      if (id && !newMap.has(id)) {
        toDelete.push(item);
      }
    });

    return { toCreate, toUpdate, toDelete };
  }

  private cloneArray(arr: any[]): any[] {
    return arr.map((item) => this.deepClone(item));
  }

  private deepClone(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Id) return obj.value;
    if (obj.toJson && typeof obj.toJson === "function") return obj.toJson();
    if (Array.isArray(obj)) return obj.map((item) => this.deepClone(item));
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) cloned[key] = this.deepClone(obj[key]);
    }
    return cloned;
  }

  private getItemId(item: any): string | undefined {
    if (!item) return undefined;
    if (item.id instanceof Id) return item.id.value;
    if (item.id !== undefined) return String(item.id);
    if (typeof item === "object" && "id" in item) {
      const id = item.id;
      return id instanceof Id ? id.value : String(id);
    }
    return undefined;
  }

  private hasChanged(obj1: any, obj2: any): boolean {
    const json1 = this.normalizeAndStringify(this.deepClone(obj1));
    const json2 = this.normalizeAndStringify(this.deepClone(obj2));
    return json1 !== json2;
  }

  private normalizeAndStringify(obj: any): string {
    if (obj === null || typeof obj !== "object") {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      const normalizedArray = obj.map((item) =>
        this.normalizeAndStringify(item)
      );
      return `[${normalizedArray.join(",")}]`;
    }

    const keys = Object.keys(obj).sort();
    const normalizedParts: string[] = [];

    for (const key of keys) {
      normalizedParts.push(`"${key}":${this.normalizeAndStringify(obj[key])}`);
    }

    return `{${normalizedParts.join(",")}}`;
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  getLastChangeForPath(path: string): HistoryEntry | undefined {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].path === path) {
        return this.history[i];
      }
    }
    return undefined;
  }

  clearHistory(): void {
    this.history = [];
    this.originalValues.clear();
    this.trackedArraysCloned.clear();
    this.trackedArraysOriginal.clear();
  }

  getTarget(): any {
    return this.target;
  }
}
