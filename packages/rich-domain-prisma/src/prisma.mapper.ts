import {
  Mapper,
  AggregateChanges,
  EntitySchemaRegistry,
  Aggregate,
} from "@woltz/rich-domain";
import {
  PrismaClientLike,
  PrismaUnitOfWork,
  UOWStorage,
  Transactional,
} from "./unit-of-work";
import { PrismaBatchExecutor } from "./batch-executor";

/**
 * Base mapper for Prisma persistence.
 * Handles both create and update using change tracking.
 *
 * @example
 * ```typescript
 * class UserToPersistenceMapper extends PrismaMapper<User> {
 *   protected readonly registry = new EntitySchemaRegistry()
 *     .register({ entity: "User", table: "user" })
 *     .register({ entity: "Post", table: "post" });
 *
 *   protected async onCreate(entity: User): Promise<void> {
 *     await this.context.user.create({
 *       data: { ... }
 *     });
 *   }
 *
 *   // onUpdate uses PrismaBatchExecutor by default — override only if needed
 * }
 * ```
 */
export abstract class PrismaToPersistence<
  TDomain extends Aggregate<any>,
  PrismaClient = PrismaClientLike,
> extends Mapper<TDomain, void> {
  constructor(
    public readonly prisma: PrismaClient,
    public readonly uow: PrismaUnitOfWork
  ) {
    super();
  }

  /**
   * Schema registry for field mapping.
   * Override in subclass.
   */
  protected abstract readonly registry: EntitySchemaRegistry;

  /**
   * Exposes the schema registry for repository PK resolution.
   */
  public getSchemaRegistry(): EntitySchemaRegistry {
    return this.registry;
  }

  /**
   * Get current context (transaction or prisma client).
   */
  protected get context(): PrismaClient {
    const ctx = UOWStorage.getStore()?.ctx;
    return ctx?.client ?? this.prisma;
  }

  /**
   * Build persistence operations.
   */
  async build(entity: TDomain): Promise<void> {
    const isNew = (entity as any).isNew?.() ?? false;

    if (isNew) {
      await this.onCreate(entity);
    } else {
      await this.handleUpdate(entity);
    }
  }

  /**
   * Handle entity creation.
   * Override in subclass.
   */
  protected abstract onCreate(entity: TDomain): Promise<void>;

  /**
   * Handle entity update with changes.
   * Default implementation uses {@link PrismaBatchExecutor}.
   * Override in subclass for custom update logic.
   */
  protected async onUpdate(
    changes: AggregateChanges,
    _entity: TDomain
  ): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
    });
    await executor.execute(changes);
  }

  /**
   * Opens a transaction (when needed) and delegates to {@link onUpdate}.
   */
  @Transactional()
  private async handleUpdate(entity: TDomain): Promise<void> {
    const changes = entity.getChanges();

    if (!changes || changes.isEmpty()) {
      return;
    }

    await this.onUpdate(changes, entity);
  }
}
