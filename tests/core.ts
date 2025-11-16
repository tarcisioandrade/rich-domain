// // ============================================================================
// // Types & Interfaces
// // ============================================================================

// import { Id } from '../src/core/id';

// export type EntityId = string | number;

// export interface BaseProps {
//   id: Id;
// }

// export interface ChangeEvent<T> {
//   previous: T | undefined;
//   current: T;
//   path: string;
// }

// export interface ArrayChangeEvent<T> {
//   toCreate: T[];
//   toUpdate: T[];
//   toDelete: T[];
//   path: string;
// }

// export type PropertySubscriber<T> = (event: ChangeEvent<T>) => void;
// export type ArraySubscriber<T> = (event: ArrayChangeEvent<T>) => void;

// export interface PropertySubscription<T> {
//   onChange: PropertySubscriber<T>;
// }

// export interface ArraySubscription<T> {
//   onChange: ArraySubscriber<T>;
// }

// type UnwrapArray<T> = T extends Array<infer U> ? U : never;
// type IsArray<T> = T extends Array<any> ? true : false;
// type NonUndefined<T> = T extends undefined ? never : T;

// export type SubscriptionConfig<T extends BaseProps> = {
//   [K in keyof T]?: IsArray<NonUndefined<T[K]>> extends true
//     ? ArraySubscription<UnwrapArray<NonUndefined<T[K]>>>
//     : PropertySubscription<NonUndefined<T[K]>>;
// };

// // ============================================================================
// // History Entry
// // ============================================================================

// interface HistoryEntry {
//   path: string;
//   previousValue: any;
//   currentValue: any;
//   timestamp: number;
// }

// // ============================================================================
// // Deep Proxy - Core Change Tracking
// // ============================================================================

// class DeepProxy {
//   private history: HistoryEntry[] = [];
//   private subscribers: Map<string, Set<Function>> = new Map();
//   private originalValues: Map<string, any> = new Map();
//   private trackedArraysCloned: Map<string, any[]> = new Map();
//   private trackedArraysOriginal: Map<string, any[]> = new Map();

//   constructor(
//     private target: any,
//     private path: string = '',
//     private rootProxy?: DeepProxy
//   ) {
//     if (!rootProxy) this.rootProxy = this;
//   }

//   createProxy(): any {
//     const handler: ProxyHandler<any> = {
//       get: (target, prop, receiver) => {
//         const value = Reflect.get(target, prop, receiver);
//         const currentPath = this.path
//           ? `${this.path}.${String(prop)}`
//           : String(prop);

//         if (
//           prop === '__isProxy' ||
//           prop === '__originalTarget' ||
//           prop === '__path' ||
//           prop === 'constructor' ||
//           prop === 'prototype'
//         ) {
//           return value;
//         }

//         if (typeof value === 'function') return value.bind(target);

//         if (Array.isArray(value)) {
//           if (!this.rootProxy!.trackedArraysCloned.has(currentPath)) {
//             this.rootProxy!.storeArrayState(currentPath, value);
//           }
//           return this.createArrayProxy(value, currentPath);
//         }

//         if (value && typeof value === 'object' && !value.__isProxy) {
//           const nestedProxy = new DeepProxy(value, currentPath, this.rootProxy);
//           return nestedProxy.createProxy();
//         }

//         return value;
//       },

//       set: (target, prop, newValue, receiver) => {
//         const currentPath = this.path
//           ? `${this.path}.${String(prop)}`
//           : String(prop);
//         const oldValue = Reflect.get(target, prop, receiver);
//         const isArrayAssignment = Array.isArray(newValue);

//         if (!isArrayAssignment && oldValue === newValue) return true;

//         if (!this.rootProxy!.originalValues.has(currentPath)) {
//           this.rootProxy!.originalValues.set(currentPath, oldValue);
//         }

//         this.rootProxy!.history.push({
//           path: currentPath,
//           previousValue: oldValue,
//           currentValue: newValue,
//           timestamp: Date.now(),
//         });

//         const result = Reflect.set(target, prop, newValue, receiver);

//         if (isArrayAssignment) {
//           if (!this.rootProxy!.trackedArraysCloned.has(currentPath)) {
//             if (Array.isArray(oldValue)) {
//               this.rootProxy!.storeArrayState(currentPath, oldValue);
//             } else {
//               this.rootProxy!.storeArrayState(currentPath, []);
//             }
//           }
//           this.rootProxy!.notifyArrayChange(currentPath, newValue);
//         } else {
//           this.rootProxy!.notifySubscribers(currentPath, oldValue, newValue);
//         }

//         return result;
//       },
//     };

//     const proxy = new Proxy(this.target, handler);
//     Object.defineProperty(proxy, '__isProxy', { value: true, writable: false });
//     return proxy;
//   }

//   private storeArrayState(path: string, arr: any[]): void {
//     this.trackedArraysCloned.set(path, this.cloneArray(arr));
//     this.trackedArraysOriginal.set(path, arr.slice());
//   }

//   private createArrayProxy(array: any[], path: string): any[] {
//     const self = this;
//     return new Proxy(array, {
//       get(target, prop, receiver) {
//         const value = Reflect.get(target, prop, receiver);
//         if (typeof value === 'function') {
//           const mutatingMethods = [
//             'push',
//             'pop',
//             'shift',
//             'unshift',
//             'splice',
//             'sort',
//             'reverse',
//           ];
//           if (mutatingMethods.includes(String(prop))) {
//             return function(...args: any[]) {
//               const result = value.apply(target, args);
//               if (!self.rootProxy!.trackedArraysCloned.has(path)) {
//                 self.rootProxy!.storeArrayState(path, target);
//               }
//               self.rootProxy!.notifyArrayChange(path, target);
//               return result;
//             };
//           }
//           return value.bind(target);
//         }
//         if (typeof value === 'object' && value !== null && !value.__isProxy) {
//           const nestedPath = `${path}[${String(prop)}]`;
//           const nestedProxy = new DeepProxy(value, nestedPath, self.rootProxy);
//           return nestedProxy.createProxy();
//         }
//         return value;
//       },
//       set(target, prop, newValue, receiver) {
//         if (!isNaN(Number(prop))) {
//           const result = Reflect.set(target, prop, newValue, receiver);
//           if (!self.rootProxy!.trackedArraysCloned.has(path)) {
//             self.rootProxy!.storeArrayState(path, target);
//           }
//           self.rootProxy!.notifyArrayChange(path, target);
//           return result;
//         }
//         return Reflect.set(target, prop, newValue, receiver);
//       },
//     });
//   }

//   subscribe(path: string, callback: Function): void {
//     if (!this.rootProxy!.subscribers.has(path)) {
//       this.rootProxy!.subscribers.set(path, new Set());
//     }
//     this.rootProxy!.subscribers.get(path)!.add(callback);

//     const actualValue = this.rootProxy!.target[path];
//     if (
//       Array.isArray(actualValue) &&
//       !this.rootProxy!.trackedArraysCloned.has(path)
//     ) {
//       this.rootProxy!.storeArrayState(path, actualValue);
//     }
//   }

//   private notifySubscribers(path: string, oldValue: any, newValue: any): void {
//     const subs = this.subscribers.get(path);
//     if (subs) {
//       subs.forEach(cb => cb({ previous: oldValue, current: newValue, path }));
//     }
//   }

//   private notifyArrayChange(path: string, newArray: any[]): void {
//     const subs = this.subscribers.get(path);
//     if (!subs) return;

//     const clonedInitial = this.trackedArraysCloned.get(path);
//     const originalInitial = this.trackedArraysOriginal.get(path);

//     if (!clonedInitial || !originalInitial) {
//       this.storeArrayState(path, newArray);
//       return;
//     }

//     const changes = this.detectArrayChanges(
//       clonedInitial,
//       originalInitial,
//       newArray
//     );
//     subs.forEach(cb => cb({ ...changes, path }));
//   }

//   private detectArrayChanges(
//     oldCloned: any[],
//     oldOriginal: any[],
//     newArray: any[]
//   ): { toCreate: any[]; toUpdate: any[]; toDelete: any[] } {
//     const toCreate: any[] = [];
//     const toUpdate: any[] = [];
//     const toDelete: any[] = [];

//     const oldMap = new Map<string, any>();
//     const newMap = new Map<string, any>();
//     const oldOriginalMap = new Map<string, any>();

//     oldCloned.forEach(item => {
//       const id = this.getItemId(item);
//       if (id) oldMap.set(id, item);
//     });

//     oldOriginal.forEach(item => {
//       const id = this.getItemId(item);
//       if (id) oldOriginalMap.set(id, item);
//     });

//     newArray.forEach(item => {
//       const id = this.getItemId(item);
//       if (id) newMap.set(id, item);
//     });

//     newArray.forEach(item => {
//       const id = this.getItemId(item);
//       if (!id) {
//         toCreate.push(item);
//       } else if (!oldMap.has(id)) {
//         toCreate.push(item);
//       } else if (this.hasChanged(oldMap.get(id), item)) {
//         toUpdate.push(item);
//       }
//     });

//     oldOriginal.forEach(item => {
//       const id = this.getItemId(item);
//       if (id && !newMap.has(id)) {
//         toDelete.push(item);
//       }
//     });

//     return { toCreate, toUpdate, toDelete };
//   }

//   private cloneArray(arr: any[]): any[] {
//     return arr.map(item => this.deepClone(item));
//   }

//   private deepClone(obj: any): any {
//     if (obj === null || obj === undefined) return obj;
//     if (typeof obj !== 'object') return obj;
//     if (obj instanceof Date) return new Date(obj.getTime());
//     if (obj instanceof Id) return obj.value;
//     if (obj.toJson && typeof obj.toJson === 'function') return obj.toJson();
//     if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
//     const cloned: any = {};
//     for (const key in obj) {
//       if (obj.hasOwnProperty(key)) cloned[key] = this.deepClone(obj[key]);
//     }
//     return cloned;
//   }

//   private getItemId(item: any): string | undefined {
//     if (!item) return undefined;
//     if (item.id instanceof Id) return item.id.value;
//     if (item.id !== undefined) return String(item.id);
//     if (typeof item === 'object' && 'id' in item) {
//       const id = item.id;
//       return id instanceof Id ? id.value : String(id);
//     }
//     return undefined;
//   }

//   private hasChanged(obj1: any, obj2: any): boolean {
//     const json1 = this.deepClone(obj1);
//     const json2 = this.deepClone(obj2);
//     return JSON.stringify(json1) !== JSON.stringify(json2);
//   }

//   getHistory(): HistoryEntry[] {
//     return [...this.history];
//   }

//   clearHistory(): void {
//     this.history = [];
//     this.originalValues.clear();
//     this.trackedArraysCloned.clear();
//     this.trackedArraysOriginal.clear();
//   }
// }

// // ============================================================================
// // Base Entity Class
// // ============================================================================

// export abstract class BaseEntity<T extends BaseProps> {
//   protected props: T;
//   private proxy: DeepProxy;
//   private proxiedProps: T;

//   constructor(props: T) {
//     this.props = { ...props };
//     this.proxy = new DeepProxy(this.props);
//     this.proxiedProps = this.proxy.createProxy();
//   }

//   get id(): Id {
//     return this.props.id;
//   }
//   get isNew(): boolean {
//     return this.props.id.isNew;
//   }
//   protected get properties(): T {
//     return this.proxiedProps;
//   }

//   subscribe(config: SubscriptionConfig<T>): void {
//     Object.keys(config).forEach(key => {
//       const sub = config[key as keyof T];
//       if (sub && 'onChange' in sub) {
//         this.proxy.subscribe(key, sub.onChange);
//       }
//     });
//   }

//   getHistory(): HistoryEntry[] {
//     return this.proxy.getHistory();
//   }
//   clearHistory(): void {
//     this.proxy.clearHistory();
//   }

//   toJson(): DeepJsonResult<T> {
//     return this.deepToJson(this.props) as DeepJsonResult<T>;
//   }

//   private deepToJson(obj: any): any {
//     if (obj === null || obj === undefined) return obj;
//     if (obj instanceof Id) return obj.value;
//     if (Array.isArray(obj)) return obj.map(item => this.deepToJson(item));
//     if (obj instanceof BaseEntity) return obj.toJson();
//     if (obj && typeof obj.toJson === 'function') return obj.toJson();
//     if (typeof obj === 'object') {
//       const result: any = {};
//       for (const key in obj) {
//         if (obj.hasOwnProperty(key)) result[key] = this.deepToJson(obj[key]);
//       }
//       return result;
//     }
//     return obj;
//   }
// }

// // ============================================================================
// // Entity & Aggregate Classes
// // ============================================================================

// export class Entity<T extends BaseProps> extends BaseEntity<T> {}
// export class Aggregate<T extends BaseProps> extends BaseEntity<T> {}

// // ============================================================================
// // Value Object
// // ============================================================================

// export abstract class ValueObject<T> {
//   protected readonly props: T;

//   constructor(props: T) {
//     this.props = Object.freeze({ ...props });
//   }

//   equals(other: ValueObject<T>): boolean {
//     if (!other || !(other instanceof ValueObject)) return false;
//     return JSON.stringify(this.props) === JSON.stringify(other.props);
//   }

//   toJson(): T {
//     return { ...this.props };
//   }
// }

// // ============================================================================
// // Type Helpers
// // ============================================================================

// type DeepJsonResult<T> = {
//   [K in keyof T]: T[K] extends Id
//     ? string
//     : T[K] extends BaseEntity<infer U>
//     ? DeepJsonResult<U>
//     : T[K] extends Array<infer U>
//     ? U extends BaseEntity<infer V>
//       ? DeepJsonResult<V>[]
//       : U extends Id
//       ? string[]
//       : U[]
//     : T[K] extends ValueObject<infer V>
//     ? V
//     : T[K];
// };
