import { AsyncLocalStorage } from "async_hooks";

/**
 * Prisma transaction client type.
 * Uses 'any' to avoid coupling with specific Prisma version.
 */
export type PrismaTransactionClient = any;

/**
 * Prisma client type.
 */
export type PrismaClientLike = {
  $transaction: <T>(
    fn: (tx: PrismaTransactionClient) => Promise<T>
  ) => Promise<T>;
  [key: string]: any;
};

export class PrismaTransactionContext {
  constructor(public readonly client: PrismaTransactionClient) {}
}

export const UOWStorage = new AsyncLocalStorage<{
  ctx: PrismaTransactionContext | null;
}>();

export class PrismaUnitOfWork {
  constructor(private readonly prisma: PrismaClientLike) {}

  /**
   * Get current transaction context (if any).
   */
  getCurrentContext(): PrismaTransactionContext | null {
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
   * All repository operations inside the callback will use the same transaction.
   *
   * @example
   * ```typescript
   * await uow.transaction(async () => {
   *   await userRepository.save(user);
   *   await orderRepository.save(order);
   *   // Both use the same transaction
   * });
   * ```
   */
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.isInTransaction()) {
      return work();
    }

    return this.prisma.$transaction(async (tx) => {
      const ctx = new PrismaTransactionContext(tx);

      return UOWStorage.run({ ctx }, async () => {
        return await work();
      });
    });
  }
}

/**
 * Decorator that wraps a method in a transaction.
 * If already inside a transaction, reuses the existing one.
 *
 * The class must have a `uow` property with the PrismaUnitOfWork instance.
 *
 * @example
 * ```typescript
 * class CreateUserUseCase {
 *   constructor(
 *     private readonly userRepository: UserRepository,
 *     private readonly uow: PrismaUnitOfWork
 *   ) {}
 *
 *   @Transactional()
 *   async execute(input: CreateUserInput) {
 *     // Automatically wrapped in transaction
 *   }
 * }
 * ```
 */
export function Transactional() {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      if (UOWStorage.getStore()?.ctx) {
        return original.apply(this, args);
      }

      const uow = findUnitOfWork(this);

      if (!uow) {
        throw new Error(
          `@Transactional: PrismaUnitOfWork not found in ${this.constructor.name} instance. ` +
            "Ensure your class has a 'uow' property. eg: constructor(private readonly uow: PrismaUnitOfWork) {}"
        );
      }

      return uow.transaction(() => original.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Find PrismaUnitOfWork in instance.
 */
function findUnitOfWork(instance: any): PrismaUnitOfWork | null {
  if (instance.uow instanceof PrismaUnitOfWork) {
    return instance.uow;
  }

  if (instance._uow instanceof PrismaUnitOfWork) {
    return instance._uow;
  }

  for (const key of Object.keys(instance)) {
    const value = instance[key];
    if (value instanceof PrismaUnitOfWork) {
      return value;
    }
  }

  return null;
}

/**
 * Helper to get current context from anywhere.
 */
export function getCurrentPrismaContext(): PrismaTransactionClient | null {
  return UOWStorage.getStore()?.ctx?.client ?? null;
}
