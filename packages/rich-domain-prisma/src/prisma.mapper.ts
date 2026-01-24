import {
  Mapper,
  AggregateChanges,
  EntitySchemaRegistry,
} from "@woltz/rich-domain";
import {
  PrismaClientLike,
  PrismaUnitOfWork,
  UOWStorage,
  Transactional,
} from "./unit-of-work";

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
 *   protected async onUpdate(entity: User, changes: AggregateChanges): Promise<void> {
 *     const batch = changes.toBatchOperations();
 *     // Process deletes, creates, updates...
 *   }
 * }
 * ```
 */
export abstract class PrismaToPersistence<
  TDomain,
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
   * Override in subclass if you need custom logic.
   */
  protected abstract onUpdate(
    entity: TDomain,
    changes: AggregateChanges
  ): Promise<void>;

  /**
   * Wrapper that ensures update runs in transaction.
   */
  @Transactional()
  private async handleUpdate(entity: TDomain): Promise<void> {
    const changes = (entity as any).getChanges?.() as
      | AggregateChanges
      | undefined;

    if (!changes || changes.isEmpty()) {
      return;
    }

    await this.onUpdate(entity, changes);
  }
}
