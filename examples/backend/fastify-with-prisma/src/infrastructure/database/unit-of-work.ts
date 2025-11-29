import { AsyncLocalStorage } from "async_hooks";
import { PrismaClient } from "@prisma/client";

export class PrismaTransactionContext {
  constructor(public readonly client: PrismaClient) {}
}

export const UOWStorage = new AsyncLocalStorage<{
  ctx: PrismaTransactionContext | null;
}>();

export class PrismaUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  getCurrentContext(): PrismaTransactionContext | null {
    return UOWStorage.getStore()?.ctx ?? null;
  }

  async transaction<T>(
    work: (ctx: PrismaTransactionContext) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const ctx = new PrismaTransactionContext(tx as PrismaClient);

      return UOWStorage.run({ ctx }, async () => {
        return await work(ctx);
      });
    });
  }
}

export function Transactional() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (UOWStorage.getStore()?.ctx) {
        return original.apply(this, args);
      }

      const ctx = (this as any).uow as PrismaUnitOfWork;

      if (!ctx) {
        throw new Error(
          `Unit of Work not found in the '${this.constructor.name}' context of the service. Did you forget to inject the UnitOfWork? eg: constructor(private readonly uow: PrismaUnitOfWork) {}`
        );
      }

      return ctx.transaction(async (tx) => {
        const ctx = new PrismaTransactionContext(tx.client);
        return UOWStorage.run({ ctx }, () => original.apply(this, args));
      });
    };

    return descriptor;
  };
}
