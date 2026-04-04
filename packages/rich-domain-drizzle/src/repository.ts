import { eq, inArray, count, SQL } from "drizzle-orm";
import {
  Aggregate,
  Repository,
  Mapper,
  Criteria,
  PaginatedResult,
} from "@woltz/rich-domain";
import { DrizzleClient, DrizzleUnitOfWork, UOWStorage } from "./unit-of-work";
import { NoRecordsAffectedError } from "./errors";
import { DrizzleToPersistence } from "./mappers/to-persistence";
import { DrizzleQueryBuilder, SearchableField } from "./query-builder";

export interface DrizzleRepositoryConfig<
  TDomain,
  TPersistence,
  TDb extends DrizzleClient = DrizzleClient,
> {
  db: TDb;
  table: any;
  toDomainMapper: Mapper<TPersistence, TDomain>;
  toPersistenceMapper: DrizzleToPersistence<TDomain, TDb>;
  uow: DrizzleUnitOfWork;
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

  constructor(config: DrizzleRepositoryConfig<TDomain, TPersistence, TDb>) {
    super();
    this.db = config.db;
    this.table = config.table;
    this.toDomainMapper = config.toDomainMapper;
    this.toPersistenceMapper = config.toPersistenceMapper;
    this.uow = config.uow;
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
        where: eq(this.table.id, id),
        with: this.getDefaultRelations(),
      });
    } else {
      const rows = await this.context
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
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
        where: inArray(this.table.id, ids),
        with: this.getDefaultRelations(),
      });
    } else {
      data = await this.context
        .select()
        .from(this.table)
        .where(inArray(this.table.id, ids));
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
      .where(eq(this.table.id, id));
    return Number(result[0]?.value ?? 0) > 0;
  }

  async save(entity: TDomain): Promise<void> {
    await this.toPersistenceMapper.build(entity);
    entity.markAsPersisted();
  }

  async delete(entity: TDomain): Promise<void> {
    const id = entity.id.value;
    try {
      const result = await this.context
        .delete(this.table)
        .where(eq(this.table.id, id))
        .returning({ id: this.table.id });

      if (!result || result.length === 0) {
        throw new NoRecordsAffectedError("Delete", this.model, String(id));
      }
    } catch (error: any) {
      if (error instanceof NoRecordsAffectedError) throw error;
      throw error;
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      const result = await this.context
        .delete(this.table)
        .where(eq(this.table.id, id))
        .returning({ id: this.table.id });

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
