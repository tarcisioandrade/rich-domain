// ============================================================================
// Unit of Work - Simple transaction management
// ============================================================================

import type { IUnitOfWork, TransactionContext } from "../types";

/**
 * Abstract Unit of Work
 * Provides transaction management across multiple repositories
 */
export abstract class UnitOfWork implements IUnitOfWork {
  protected currentContext: TransactionContext | null = null;
  protected repositoryCache: Map<string, any> = new Map();

  abstract begin(): Promise<TransactionContext>;

  /**
   * Execute work within a transaction
   * Auto-commits on success, rolls back on error
   */
  async transaction<T>(
    work: (ctx: TransactionContext) => Promise<T>
  ): Promise<T> {
    const ctx = await this.begin();

    try {
      const result = await work(ctx);
      await ctx.commit();
      return result;
    } catch (error) {
      if (ctx.isActive()) {
        await ctx.rollback();
      }
      throw error;
    } finally {
      this.currentContext = null;
      this.repositoryCache.clear();
    }
  }

  /**
   * Get repository instance (cached per transaction)
   */
  getRepository<TRepo>(RepositoryClass: new (...args: any[]) => TRepo): TRepo {
    const key = RepositoryClass.name;

    if (this.repositoryCache.has(key)) {
      return this.repositoryCache.get(key);
    }

    const repo = this.createRepository(RepositoryClass);
    this.repositoryCache.set(key, repo);
    return repo;
  }

  /**
   * Create repository instance - implement in subclass
   */
  protected abstract createRepository<TRepo>(
    RepositoryClass: new (...args: any[]) => TRepo
  ): TRepo;
}

/**
 * Base Transaction Context
 */
export abstract class BaseTransactionContext implements TransactionContext {
  protected _isActive = true;

  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;

  isActive(): boolean {
    return this._isActive;
  }

  protected markInactive(): void {
    this._isActive = false;
  }
}
