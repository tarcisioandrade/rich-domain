import {
  Mapper,
  AggregateChanges,
  EntitySchemaRegistry,
  Aggregate,
} from "@woltz/rich-domain";
import {
  DrizzleClient,
  DrizzleUnitOfWork,
  UOWStorage,
  Transactional,
} from "../unit-of-work";
import { DrizzleBatchExecutor } from "../batch-executor";

export abstract class DrizzleToPersistence<
  TDomain extends Aggregate<any>,
  TDb extends DrizzleClient = DrizzleClient,
> extends Mapper<TDomain, void> {
  constructor(
    protected readonly db: TDb,
    protected readonly uow: DrizzleUnitOfWork
  ) {
    super();
  }

  /**
   * Schema registry for field mapping (entity → table, field → column).
   */
  protected abstract readonly registry: EntitySchemaRegistry;

  /**
   * Exposes the schema registry for repository PK resolution.
   */
  public getSchemaRegistry(): EntitySchemaRegistry {
    return this.registry;
  }

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
   * Get current context (transaction client or raw db).
   */
  protected get context(): TDb {
    const ctx = UOWStorage.getStore()?.ctx;
    return (ctx?.client ?? this.db) as TDb;
  }

  /**
   * Build persistence operations.
   */
  async build(entity: TDomain): Promise<void> {
    const isNew = entity.isNew();

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
    _aggregate: TDomain
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
    const changes = entity.getChanges();

    if (!changes || changes.isEmpty()) {
      return;
    }

    await this.onUpdate(changes, entity);
  }
}
