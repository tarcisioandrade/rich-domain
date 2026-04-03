import { AsyncLocalStorage } from "async_hooks";

/**
 * Drizzle database instance type.
 * Generic to support pg, mysql, sqlite, and other drivers.
 */
export type DrizzleClient = {
  transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  query: Record<string, any>;
  select: (...args: any[]) => any;
  insert: (table: any) => any;
  update: (table: any) => any;
  delete: (table: any) => any;
  [key: string]: any;
};

export type DrizzleTransactionClient = DrizzleClient;

export class DrizzleTransactionContext {
  constructor(public readonly client: DrizzleTransactionClient) {}
}

export const UOWStorage = new AsyncLocalStorage<{
  ctx: DrizzleTransactionContext | null;
}>();

export class DrizzleUnitOfWork {
  constructor(private readonly db: DrizzleClient) {}

  /**
   * Get current transaction context (if any).
   */
  getCurrentContext(): DrizzleTransactionContext | null {
    return UOWStorage.getStore()?.ctx ?? null;
  }

  /**
   * Check if currently inside a transaction.
   */
  isInTransaction(): boolean {
    return this.getCurrentContext() !== null;
  }

  /**
   * Execute work inside a transaction.
   * If already in a transaction, reuses the existing context (idempotent nesting).
   */
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.isInTransaction()) {
      return work();
    }

    return this.db.transaction(async (tx: any) => {
      const ctx = new DrizzleTransactionContext(tx);

      return UOWStorage.run({ ctx }, async () => {
        return await work();
      });
    });
  }
}

/**
 * Decorator that wraps a method in a transaction.
 * If already inside a transaction, reuses the existing one.
 */
export function Transactional(inputUow?: DrizzleUnitOfWork): MethodDecorator {
  return function (
    _target: any,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      if (UOWStorage.getStore()?.ctx) {
        return original.apply(this, args);
      }

      const uow = inputUow ?? findUnitOfWork(this);

      if (!uow) {
        throw new Error(
          `@Transactional: DrizzleUnitOfWork not found in ${this.constructor.name} instance. ` +
            "Ensure your class has a 'uow' property. eg: constructor(private readonly uow: DrizzleUnitOfWork) {}"
        );
      }

      return uow.transaction(() => original.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Find DrizzleUnitOfWork in instance.
 */
function findUnitOfWork(instance: any): DrizzleUnitOfWork | null {
  if (instance.uow instanceof DrizzleUnitOfWork) {
    return instance.uow;
  }

  if (instance._uow instanceof DrizzleUnitOfWork) {
    return instance._uow;
  }

  for (const key of Object.keys(instance)) {
    const value = instance[key];
    if (value instanceof DrizzleUnitOfWork) {
      return value;
    }
  }

  return null;
}

/**
 * Helper to get current transaction client from anywhere.
 */
export function getCurrentDrizzleContext(): DrizzleTransactionClient | null {
  return UOWStorage.getStore()?.ctx?.client ?? null;
}
