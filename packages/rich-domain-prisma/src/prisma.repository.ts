import {
  Aggregate,
  Repository,
  Mapper,
  Criteria,
  PaginatedResult,
  FilterOperator,
  CriteriaOptions,
} from "@woltz/rich-domain";
import {
  PrismaClientLike,
  PrismaTransactionClient,
  PrismaUnitOfWork,
  UOWStorage,
} from "./unit-of-work";

/**
 * 
 */
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
  TPersistence = any
> extends Repository<TDomain> {
  constructor(
    protected readonly mapperToPersistence: Mapper<TDomain, void>,
    protected readonly mapperToDomain: Mapper<TPersistence, TDomain>,
    public readonly prisma: PrismaClientLike,
    public readonly uow: PrismaUnitOfWork
  ) {
    super();
  }

  /**
   * Model name in Prisma (e.g., 'user', 'post').
   * Must match the model name in your Prisma schema.
   */
  protected abstract readonly model: string;

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
  protected get context(): PrismaClientLike | PrismaTransactionClient {
    const ctx = UOWStorage.getStore()?.ctx;
    return ctx?.client ?? this.prisma;
  }

  /**
   * Get model accessor from context.
   */
  protected get modelAccessor(): any {
    return (this.context as any)[this.model];
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

    const toDomain = data.map((item: TPersistence) =>
      this.mapperToDomain.build(item)
    );

    return PaginatedResult.create(toDomain, criteria.getPagination(), total);
  }

  async findById(id: string): Promise<TDomain | null> {
    const data = await this.modelAccessor.findUnique({
      where: { id },
      include: this.includes,
    });

    return data ? this.mapperToDomain.build(data) : null;
  }

  async findOne(criteria: Criteria<TDomain>): Promise<TDomain | null> {
    const args = this.applyCriteria(criteria);

    const data = await this.modelAccessor.findFirst({
      ...args,
      include: this.includes,
    });

    return data ? this.mapperToDomain.build(data) : null;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.modelAccessor.count({
      where: { id },
    });
    return count > 0;
  }

  async delete(entity: TDomain): Promise<void> {
    await this.modelAccessor.delete({
      where: { id: entity.id.value },
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.modelAccessor.delete({
      where: { id },
    });
  }

  /**
   * Save entity (create or update).
   * Uses change tracking to determine what changed.
   */
  async save(entity: TDomain): Promise<void> {
    await this.mapperToPersistence.build(entity);
    entity.markAsClean();
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
      const or = search.fields.map((field) =>
        this.buildNestedContains(field, search.value)
      );

      if (Object.keys(where).length > 0) {
        args.where = { AND: [where, { OR: or }] };
      } else {
        args.where = { OR: or };
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
}
