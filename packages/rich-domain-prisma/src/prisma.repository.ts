import {
  Aggregate,
  Repository,
  Mapper,
  Criteria,
  PaginatedResult,
  FilterOperator,
  CriteriaOptions,
} from "@woltz/rich-domain";
import { PrismaClientLike, PrismaUnitOfWork, UOWStorage } from "./unit-of-work";
import { ModelNotFoundError, NoRecordsAffectedError } from "./errors";

export interface PrismaRepositoryConfig {
  prisma: PrismaClientLike;
  uow: PrismaUnitOfWork;
}

/**
 *
 * @template TDomain
 * @template TPersistence
 */
export abstract class PrismaRepository<
  TDomain extends Aggregate<any>,
  TPersistence,
  TContext = PrismaClientLike,
> extends Repository<TDomain> {
  constructor(
    protected readonly toPersistenceMapper: Mapper<TDomain, void>,
    protected readonly toDomainMapper: Mapper<TPersistence, TDomain>,
    private readonly prisma: TContext,
    public readonly uow: PrismaUnitOfWork
  ) {
    super();
  }

  /**
   * Model name in Prisma (e.g., 'user', 'post').
   * Must match the model name in your Prisma schema.
   */
  protected abstract get model(): string;

  /**
   * Generate search conditions for full-text search.
   *
   * @param search - The search term entered by the user
   * @returns Array of OR conditions for Prisma where clause
   *
   * @example
   * ```typescript
   * // In your repository implementation:
   * protected generateSearchQuery(search: string): Prisma.PostWhereInput[] {
   *   return [
   *     { title: { contains: search, mode: 'insensitive' } },
   *     { content: { contains: search, mode: 'insensitive' } },
   *     { author: { name: { contains: search, mode: 'insensitive' } } }
   *   ];
   * }
   * ```
   */
  protected abstract generateSearchQuery(search: string): any[];

  /**
   * Relations to include when fetching.
   * Override in subclass.
   *
   * @example
   * ```typescript
   * protected readonly includes = { posts: true, profile: true };
   * ```
   */
  protected readonly includes: Record<string, any> = {};

  /**
   * Get current context (transaction or prisma client).
   */
  protected get context(): TContext {
    const ctx = UOWStorage.getStore()?.ctx;
    return ctx?.client ?? this.prisma;
  }

  /**
   * Get model accessor from context.
   * Throws ModelNotFoundError if model doesn't exist.
   */
  protected get modelAccessor(): any {
    const model = (this.context as any)[this.model];

    if (!model) {
      const availableModels = this.getAvailableModels();
      throw new ModelNotFoundError(this.model, availableModels);
    }

    return model;
  }

  /**
   * Get list of available Prisma models for better error messages.
   */
  private getAvailableModels(): string[] {
    const models: string[] = [];
    const ctx = this.context as any;

    for (const key of Object.keys(ctx)) {
      const value = ctx[key];
      // Check if it looks like a Prisma model (has common methods)
      if (
        value &&
        typeof value === "object" &&
        typeof value.findMany === "function" &&
        typeof value.create === "function"
      ) {
        models.push(key);
      }
    }

    return models;
  }

  async count(criteria?: Criteria<TDomain>): Promise<number> {
    const args = criteria ? this.applyCriteria(criteria) : {};
    return await this.modelAccessor.count(args);
  }

  async find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>> {
    const args = this.applyCriteria(criteria);

    const [data, total] = await Promise.all([
      this.modelAccessor.findMany({
        ...args,
        include: this.includes,
      }),
      this.modelAccessor.count({ where: args.where }),
    ]);

    const toDomain: TDomain[] = data.map((item: TPersistence) =>
      this.toDomainMapper.build(item)
    );

    this.markArrayOfAggregateWithClean(toDomain);

    return PaginatedResult.create(toDomain, criteria.getPagination(), total);
  }

  async findById(id: string): Promise<TDomain | null> {
    const data = await this.modelAccessor.findUnique({
      where: { id },
      include: this.includes,
    });
    const result = data ? this.toDomainMapper.build(data) : null;

    if (result instanceof Aggregate) {
      result.markAsClean();
    }

    return result;
  }

  async findManyByIds(ids: string[]): Promise<TDomain[]> {
    const data = await this.modelAccessor.findMany({
      where: { id: { in: ids } },
      include: this.includes,
    });

    const toDomain: TDomain[] = data.map((item: TPersistence) =>
      this.toDomainMapper.build(item)
    );

    this.markArrayOfAggregateWithClean(toDomain);

    return toDomain;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.modelAccessor.count({
      where: { id },
    });
    return count > 0;
  }

  async delete(entity: TDomain): Promise<void> {
    try {
      await this.modelAccessor.delete({
        where: { id: entity.id.value },
      });
    } catch (error: any) {
      // Prisma throws P2025 when record is not found
      if (error.code === "P2025") {
        throw new NoRecordsAffectedError(
          "Delete",
          this.model,
          entity.id.value,
          error
        );
      }
      throw error;
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.modelAccessor.delete({
        where: { id },
      });
    } catch (error: any) {
      // Prisma throws P2025 when record is not found
      if (error.code === "P2025") {
        throw new NoRecordsAffectedError("Delete", this.model, id, error);
      }
      throw error;
    }
  }

  /**
   * Save entity (create or update).
   * Uses change tracking to determine what changed.
   */
  async save(entity: TDomain): Promise<void> {
    await this.toPersistenceMapper.build(entity);
    entity.markAsPersisted();
  }

  /**
   * Execute work inside a transaction.
   * Shortcut for `this.uow.transaction()`.
   */
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    return this.uow.transaction(work);
  }

  protected applyCriteria(criteria: Criteria<any>): {
    where?: any;
    take?: number;
    skip?: number;
    orderBy?: Array<{ [key: string]: "asc" | "desc" }>;
  } {
    const where: any = {};
    const args: {
      where: any;
      take?: number;
      skip?: number;
      orderBy?: Array<{ [key: string]: "asc" | "desc" }>;
    } = { where };

    for (const filter of criteria.getFilters()) {
      const condition = this.buildNestedCondition(
        filter.field,
        filter.operator,
        filter.value,
        filter.options?.quantifier
      );
      this.mergeDeep(where, condition);
    }

    if (criteria.hasSearch()) {
      const search = criteria.getSearch()!;
      const searchConditions = this.generateSearchQuery(search);

      if (Object.keys(where).length > 0) {
        args.where = { AND: [where, { OR: searchConditions }] };
      } else {
        args.where = { OR: searchConditions };
      }
    }

    const orders = criteria.getOrders();
    if (orders.length > 0) {
      args.orderBy = orders.map((o) => ({
        [o.field]: o.direction,
      }));
    }

    const pagination = criteria.getPagination();
    if (pagination) {
      args.skip = pagination.offset;
      args.take = pagination.limit;
    }

    return args;
  }

  protected buildOperator(operator: FilterOperator, value: any): any {
    switch (operator) {
      case "equals":
        return value;
      case "notEquals":
        return { not: value };
      case "contains":
        return { contains: String(value), mode: "insensitive" };
      case "startsWith":
        return { startsWith: String(value), mode: "insensitive" };
      case "endsWith":
        return { endsWith: String(value), mode: "insensitive" };
      case "greaterThan":
        return { gt: value };
      case "greaterThanOrEqual":
        return { gte: value };
      case "lessThan":
        return { lt: value };
      case "lessThanOrEqual":
        return { lte: value };
      case "between":
        return { gte: value[0], lte: value[1] };
      case "in":
        return { in: value };
      case "notIn":
        return { notIn: value };
      case "isNull":
        return null;
      case "isNotNull":
        return { not: null };
      default:
        return value;
    }
  }

  protected buildNestedCondition(
    fieldPath: string,
    operator: FilterOperator,
    value: any,
    quantifier?: CriteriaOptions["quantifier"]
  ): any {
    const parts = fieldPath.split(".");
    const lastPart = parts.pop()!;
    const leaf = this.buildOperator(operator, value);

    let node: any = { [lastPart]: leaf };

    for (let i = parts.length - 1; i >= 0; i--) {
      const parent = parts[i];

      if (this.looksLikeCollection(parent)) {
        const q = quantifier ?? "some";
        node = { [parent]: { [q]: node } };
      } else {
        node = { [parent]: node };
      }
    }

    return node;
  }

  protected buildNestedContains(path: string, value: string): any {
    const parts = path.split(".");
    const lastPart = parts.pop()!;

    let node: any = {
      [lastPart]: { contains: value, mode: "insensitive" },
    };

    for (let i = parts.length - 1; i >= 0; i--) {
      const parent = parts[i];

      if (this.looksLikeCollection(parent)) {
        node = { [parent]: { some: node } };
      } else {
        node = { [parent]: node };
      }
    }

    return node;
  }

  protected looksLikeCollection(field: string): boolean {
    return field.endsWith("s");
  }

  protected mergeDeep(target: any, source: any): void {
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (!target[key]) target[key] = {};
        this.mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  private markArrayOfAggregateWithClean(entity: TDomain[]): void {
    for (const item of entity) {
      if (item instanceof Aggregate) {
        item.markAsClean();
      }
    }
  }
}
