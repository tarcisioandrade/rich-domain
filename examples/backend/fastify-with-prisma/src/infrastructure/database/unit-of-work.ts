import { PrismaClient } from "@prisma/client";
import { RepositoryError, UnitOfWork, } from "@woltz/rich-domain";
import { PrismaTransactionContext } from "./prisma-transaction-context";

export class PrismaUnitOfWork extends UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  async begin(): Promise<PrismaTransactionContext> {
    const ctx = new PrismaTransactionContext(this.prisma);
    this.currentContext = ctx;
    return ctx;
  }

  protected createRepository<TRepo>(
    RepositoryClass: new (...args: any[]) => TRepo
  ): TRepo {
    if (!this.currentContext) {
      throw new RepositoryError(
        "Cannot get repository outside of a UnitOfWork transaction"
      );
    }

    const ctx = this.currentContext as PrismaTransactionContext;

    return new RepositoryClass(ctx.client);
  }

  getCurrentContext(): PrismaTransactionContext | null {
    return this.currentContext as PrismaTransactionContext | null;
  }

  async transaction<T>(
    work: (ctx: PrismaTransactionContext) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const ctx = new PrismaTransactionContext(tx as PrismaClient);
      this.currentContext = ctx;
      ctx.client
      try {
        const result = await work(ctx);
        ctx.commit();
        return result;
      } catch (err) {
        if (ctx.isActive()) ctx.rollback();
        throw err;
      } finally {
        this.currentContext = null;
        this.repositoryCache.clear();
      }
    });
  }
}
