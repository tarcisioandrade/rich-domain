import {
  Mapper,
  AggregateChanges,
  EntitySchemaRegistry,
} from "@woltz/rich-domain";
import {
  DrizzleClient,
  DrizzleUnitOfWork,
  UOWStorage,
  Transactional,
} from "../unit-of-work";
import { DrizzleBatchExecutor } from "../batch-executor";

export abstract class DrizzleToPersistence<TDomain> extends Mapper<
  TDomain,
  void
> {
  constructor(protected readonly uow: DrizzleUnitOfWork) {
    super();
  }

  /**
   * Schema registry for field mapping (entity → table, field → column).
   */
  protected abstract readonly registry: EntitySchemaRegistry;

  /**
   * Map of entity names to Drizzle table objects.
   *
   * @example
   * ```typescript
   * protected readonly tableMap = new Map([
   *   ["User", usersTable],
   *   ["Post", postsTable],
   * ]);
   * ```
   */
  protected abstract readonly tableMap: Map<string, any>;

  /**
   * Get the raw db instance.
   */
  protected abstract getDb(): DrizzleClient;

  /**
   * Get current context (transaction client or raw db).
   */
  protected get context(): DrizzleClient {
    const ctx = UOWStorage.getStore()?.ctx;
    return ctx?.client ?? this.getDb();
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
   * Handle new aggregate creation.
   * Must be implemented by subclass.
   */
  protected abstract onCreate(aggregate: TDomain): Promise<void>;

  /**
   * Handle aggregate update with changes.
   * Default implementation uses DrizzleBatchExecutor.
   * Subclass can override for custom logic.
   */
  protected async onUpdate(
    changes: AggregateChanges,
    _aggregate: TDomain,
  ): Promise<void> {
    const executor = new DrizzleBatchExecutor({
      registry: this.registry,
      db: this.context,
      tableMap: this.tableMap,
    });
    await executor.execute(changes);
  }

  @Transactional()
  private async handleUpdate(entity: TDomain): Promise<void> {
    const changes = (entity as any).getChanges?.() as
      | AggregateChanges
      | undefined;

    if (!changes || changes.isEmpty()) {
      return;
    }

    await this.onUpdate(changes, entity);
  }
}
