import { AsyncLocalStorage } from "node:async_hooks";
import { DataSource, EntityManager, QueryRunner } from "typeorm";

/**
 * Context for a TypeORM transaction.
 */
export interface TypeORMTransactionContext {
  entityManager: EntityManager;
  queryRunner: QueryRunner;
  isActive: boolean;
}

/**
 * Storage for per-request transaction isolation.
 */
export class UOWStorage {
  private static storage = new AsyncLocalStorage<TypeORMTransactionContext>();

  static getStore(): TypeORMTransactionContext | undefined {
    return this.storage.getStore();
  }

  static run<T>(context: TypeORMTransactionContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }
}

/**
 * Unit of Work implementation for TypeORM.
 *
 * Provides transaction management with per-request isolation using AsyncLocalStorage.
 * Ensures that all operations within a request share the same transaction context.
 *
 * @example
 * ```typescript
 * const dataSource = new DataSource({ ... });
 * await dataSource.initialize();
 *
 * const uow = new TypeORMUnitOfWork(dataSource);
 *
 * // Execute in transaction
 * await uow.transaction(async () => {
 *   await userRepository.save(user);
 *   await orderRepository.save(order);
 *   // All or nothing - rolls back on error
 * });
 *
 * // Check if in transaction
 * const isActive = uow.isInTransaction();
 *
 * // Get current EntityManager (transaction or default)
 * const em = uow.getCurrentEntityManager();
 * ```
 */
export class TypeORMUnitOfWork {
  constructor(private readonly dataSource: DataSource) {
    if (!dataSource.isInitialized) {
      throw new Error(
        "TypeORMUnitOfWork: DataSource must be initialized before use"
      );
    }
  }

  /**
   * Execute a function within a transaction.
   *
   * If already in a transaction, reuses the existing context.
   * Otherwise, creates a new transaction.
   *
   * @param fn - Function to execute within transaction
   * @returns Result of the function
   *
   * @example
   * ```typescript
   * await uow.transaction(async () => {
   *   const user = User.create({ name: "John" });
   *   await userRepository.save(user);
   *
   *   const post = Post.create({ title: "Hello", authorId: user.id });
   *   await postRepository.save(post);
   * });
   * ```
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const existingContext = UOWStorage.getStore();

    // Reuse existing transaction if already active
    if (existingContext?.isActive) {
      return fn();
    }

    // Create new transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const context: TypeORMTransactionContext = {
      entityManager: queryRunner.manager,
      queryRunner,
      isActive: true,
    };

    try {
      const result = await UOWStorage.run(context, fn);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get the current EntityManager.
   *
   * Returns the transaction EntityManager if within a transaction,
   * otherwise returns the default DataSource manager.
   *
   * @returns EntityManager instance
   */
  getCurrentEntityManager(): EntityManager {
    const context = UOWStorage.getStore();
    return context?.entityManager ?? this.dataSource.manager;
  }

  /**
   * Check if currently within a transaction.
   *
   * @returns true if in an active transaction, false otherwise
   */
  isInTransaction(): boolean {
    const context = UOWStorage.getStore();
    return context?.isActive ?? false;
  }

  /**
   * Get the current transaction context (if any).
   *
   * @returns Transaction context or null
   */
  getCurrentContext(): TypeORMTransactionContext | null {
    return UOWStorage.getStore() ?? null;
  }

  /**
   * Get the underlying DataSource.
   *
   * @returns DataSource instance
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }
}

/**
 * Get current TypeORM transaction context.
 *
 * Utility function to access the current transaction context
 * from anywhere in the application.
 *
 * @returns Current context or null if not in transaction
 *
 * @example
 * ```typescript
 * const context = getCurrentTypeORMContext();
 * if (context) {
 *   const em = context.entityManager;
 *   // Use transactional entity manager
 * }
 * ```
 */
export function getCurrentTypeORMContext(): TypeORMTransactionContext | null {
  return UOWStorage.getStore() ?? null;
}