import { Aggregate } from "../entity";
import { Repository } from "../repository/base-repository";

/**
 * Transaction context for Unit of Work
 */
export interface TransactionContext {
  /**
   * Commit all changes
   */
  commit(): Promise<void>;

  /**
   * Rollback all changes
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   */
  isActive(): boolean;
}

/**
 * Unit of Work interface
 * Manages transactions across multiple repositories
 */
export interface IUnitOfWork {
  /**
   * Start a new transaction
   */
  begin(): Promise<TransactionContext>;

  /**
   * Execute work within a transaction
   * Auto-commits on success, rolls back on error
   */
  transaction<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;

  /**
   * Get repository within transaction context
   */
  getRepository<TDomain extends Aggregate<any>>(
    repository: new (...args: any[]) => Repository<TDomain>
  ): Repository<TDomain>;
}
