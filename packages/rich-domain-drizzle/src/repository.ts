import { eq, inArray, count, SQL } from "drizzle-orm";
import {
  Aggregate,
  Repository,
  Mapper,
  Criteria,
  PaginatedResult,
  IDomainEvent,
} from "@woltz/rich-domain";
import { DrizzleClient, DrizzleUnitOfWork, UOWStorage } from "./unit-of-work";
import { NoRecordsAffectedError } from "./errors";
import { DrizzleToPersistence } from "./mappers/to-persistence";
import { DrizzleQueryBuilder, SearchableField } from "./query-builder";
import { DrizzleOutboxStore } from "./outbox-store";

export interface DrizzleRepositoryConfig<
  TDomain extends Aggregate<any>,
  TPersistence,
  TDb extends DrizzleClient = DrizzleClient,
> {
  db: TDb;
  table: any;
  toDomainMapper: Mapper<TPersistence, TDomain>;
  toPersistenceMapper: DrizzleToPersistence<TDomain, TDb>;
  uow: DrizzleUnitOfWork;
  /** Optional outbox store for auto-saving domain events in the same transaction. */
  outboxStore?: DrizzleOutboxStore;
}

export abstract class DrizzleRepository<
  TDomain extends Aggregate<any>,
  TPersistence,
  TDb extends DrizzleClient = DrizzleClient,
> extends Repository<TDomain> {
  protected readonly db: TDb;
  protected readonly table: any;
  protected readonly toDomainMapper: Mapper<TPersistence, TDomain>;
  protected readonly toPersistenceMapper: DrizzleToPersistence<TDomain, TDb>;
  protected readonly uow: DrizzleUnitOfWork;
  private readonly outboxStore?: DrizzleOutboxStore;

  constructor(config: DrizzleRepositoryConfig<TDomain, TPersistence, TDb>) {
    super();
    this.db = config.db;
    this.table = config.table;
    this.toDomainMapper = config.toDomainMapper;
    this.toPersistenceMapper = config.toPersistenceMapper;
    this.uow = config.uow;
    this.outboxStore = config.outboxStore;
  }

  /**
   * Returns tx from UOWStorage if inside a transaction, otherwise the raw db.
   */
  protected get context(): TDb {
    const ctx = UOWStorage.getStore()?.ctx;
    return (ctx?.client ?? this.db) as TDb;
  }

  /**
   * The table name string used by EntitySchemaRegistry and db.query accessor.
   */
  protected abstract get model(): string;

  /**
   * Search conditions for full-text search via Criteria.search().
   */
  protected abstract getSearchableFields(): SearchableField<TPersistence>[];

  /**
   * Relations to include when fetching (for Drizzle relational query API).
   */
  protected getDefaultRelations(): Record<string, any> {
    return {};
  }

  protected resolveEntitySchema(): { entity: string; table: string } | null {
    return (
      this.toPersistenceMapper
        .getSchemaRegistry()
        .getAllSchemas()
        .find((schema) => schema.table === this.model) ?? null
    );
  }

  protected getPrimaryKeyColumn() {
    const schema = this.resolveEntitySchema();
    const pkField = schema
      ? this.toPersistenceMapper
          .getSchemaRegistry()
          .getPrimaryKeyField(schema.entity)
      : "id";
    const column = this.table[pkField];

    return column ?? this.table.id;
  }

  async find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>> {
    const { where, orderBy, limit, offset } = DrizzleQueryBuilder.apply(
      criteria,
      this.table,
      this.getSearchableFields()
    );

    const queryModel = this.context.query?.[this.model];

    let data: TPersistence[];
    let total: number;

    if (queryModel) {
      [data, total] = await Promise.all([
        queryModel.findMany({
          where,
          orderBy,
          limit,
          offset,
          with: this.getDefaultRelations(),
        }),
        this.context
          .select({ value: count() })
          .from(this.table)
          .where(where)
          .then((r: any[]) => Number(r[0]?.value ?? 0)),
      ]);
    } else {
      const selectQuery = this.context.select().from(this.table).$dynamic();

      if (where) selectQuery.where(where);
      if (orderBy && orderBy.length > 0) selectQuery.orderBy(...orderBy);
      if (limit !== undefined) selectQuery.limit(limit);
      if (offset !== undefined) selectQuery.offset(offset);

      const countQuery = this.context
        .select({ value: count() })
        .from(this.table);
      if (where) countQuery.where(where);

      [data, [{ value: total }]] = await Promise.all([selectQuery, countQuery]);
      total = Number(total ?? 0);
    }

    const toDomain: TDomain[] = (data as any[]).map((item) =>
      this.toDomainMapper.build(item)
    );

    this.markArrayOfAggregateWithClean(toDomain);

    return PaginatedResult.create(toDomain, criteria.getPagination(), total);
  }

  async findById(id: string): Promise<TDomain | null> {
    const queryModel = this.context.query?.[this.model];

    let data: any;

    if (queryModel) {
      data = await queryModel.findFirst({
        where: eq(this.getPrimaryKeyColumn(), id),
        with: this.getDefaultRelations(),
      });
    } else {
      const rows = await this.context
        .select()
        .from(this.table)
        .where(eq(this.getPrimaryKeyColumn(), id))
        .limit(1);
      data = rows[0] ?? null;
    }

    if (!data) return null;

    const result = this.toDomainMapper.build(data);

    if (result instanceof Aggregate) {
      result.markAsClean();
    }

    return result;
  }

  async findManyByIds(ids: string[]): Promise<TDomain[]> {
    if (ids.length === 0) return [];

    const queryModel = this.context.query?.[this.model];

    let data: any[];

    if (queryModel) {
      data = await queryModel.findMany({
        where: inArray(this.getPrimaryKeyColumn(), ids),
        with: this.getDefaultRelations(),
      });
    } else {
      data = await this.context
        .select()
        .from(this.table)
        .where(inArray(this.getPrimaryKeyColumn(), ids));
    }

    const toDomain: TDomain[] = data.map((item: any) =>
      this.toDomainMapper.build(item)
    );

    this.markArrayOfAggregateWithClean(toDomain);

    return toDomain;
  }

  async count(criteria?: Criteria<TDomain>): Promise<number> {
    let where: SQL | undefined;

    if (criteria) {
      ({ where } = DrizzleQueryBuilder.apply(
        criteria,
        this.table,
        this.getSearchableFields()
      ));
    }

    const query = this.context.select({ value: count() }).from(this.table);
    if (where) query.where(where);

    const result = await query;
    return Number(result[0]?.value ?? 0);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.context
      .select({ value: count() })
      .from(this.table)
      .where(eq(this.getPrimaryKeyColumn(), id));
    return Number(result[0]?.value ?? 0) > 0;
  }

  /**
   * Save entity (create or update).
   * Uses change tracking to determine what changed.
   *
   * If an {@link DrizzleOutboxStore} is configured, uncommitted domain events
   * are extracted from the aggregate and saved to the outbox table in the
   * same transaction context (guaranteeing atomicity).
   */
  async save(entity: TDomain): Promise<void> {
    // Extract uncommitted events BEFORE the mapper mutates the aggregate state.
    const events = this.extractEvents(entity);

    await this.toPersistenceMapper.build(entity);
    entity.markAsPersisted();

    // Auto-save events to outbox — uses the same transactional client
    // if inside a DrizzleUnitOfWork transaction.
    if (events.length > 0 && this.outboxStore) {
      await this.outboxStore.save(events);
    }
  }

  /**
   * Extract uncommitted domain events from an aggregate.
   * Uses duck-typing to avoid importing BaseAggregate from core,
   * keeping the adapter loosely coupled.
   *
   * **Important:** events are NOT cleared from the aggregate here.
   * The outbox is a *copy* — `dispatchAll()` still publishes immediately
   * via the event bus, and the publisher only picks up events that were
   * never dispatched (or whose immediate publish failed).
   */
  private extractEvents(entity: TDomain): IDomainEvent[] {
    if (
      typeof entity.hasUncommittedEvents === "function" &&
      typeof entity.getUncommittedEvents === "function" &&
      entity.hasUncommittedEvents()
    ) {
      return entity.getUncommittedEvents();
    }

    return [];
  }

  async delete(entity: TDomain): Promise<void> {
    const id = entity.id.value;
    const pkColumn = this.getPrimaryKeyColumn();
    try {
      const result = await this.context
        .delete(this.table)
        .where(eq(pkColumn, id))
        .returning({ id: pkColumn });

      if (!result || result.length === 0) {
        throw new NoRecordsAffectedError("Delete", this.model, String(id));
      }
    } catch (error: any) {
      if (error instanceof NoRecordsAffectedError) throw error;
      throw error;
    }
  }

  async deleteById(id: string): Promise<void> {
    const pkColumn = this.getPrimaryKeyColumn();
    try {
      const result = await this.context
        .delete(this.table)
        .where(eq(pkColumn, id))
        .returning({ id: pkColumn });

      if (!result || result.length === 0) {
        throw new NoRecordsAffectedError("Delete", this.model, id);
      }
    } catch (error: any) {
      if (error instanceof NoRecordsAffectedError) throw error;
      throw error;
    }
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    return this.uow.transaction(work);
  }

  private markArrayOfAggregateWithClean(entities: TDomain[]): void {
    for (const entity of entities) {
      if (entity instanceof Aggregate) {
        entity.markAsClean();
      }
    }
  }
}
