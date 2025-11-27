import { PrismaClient } from "@prisma/client";
import { PrismaTransactionContext } from "./prisma-transaction-context";
import { AsyncLocalStorage } from "node:async_hooks";

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
