import type { PrismaClient } from "@prisma/client";
import {
  Aggregate,
  Repository,
  Mapper,
  Criteria,
  PaginatedResult,
} from "@woltz/rich-domain";
import { PrismaUnitOfWork } from "./unit-of-work";

export abstract class PrismaRepository<
  TDomain extends Aggregate<any>,
  TPersistence
> extends Repository<TDomain> {
  public readonly uow: PrismaUnitOfWork;

  constructor(
    protected readonly mapperToPersistence: Mapper<TDomain, unknown>,
    protected readonly mapperToDomain: Mapper<TPersistence, TDomain>,
    private readonly prisma: PrismaClient
  ) {
    super();
    this.uow = new PrismaUnitOfWork(this.prisma);
  }

  protected abstract includes: unknown;

  get context() {
    const transactionalContext = this.uow.getCurrentContext();
    if (transactionalContext) {
      return transactionalContext.client;
    }
    return this.prisma;
  }

  async count(criteria: Criteria<TDomain>): Promise<number> {
    const args = this.applyCriteria(criteria);
    return await (this.context[this.model] as any).count(args);
  }

  async find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>> {
    const args = this.applyCriteria(criteria);
    const [data, total] = await Promise.all([
      (this.context[this.model] as any).findMany({
        ...args,
        include: this.includes,
      }),
      (this.context[this.model] as any).count(),
    ]);

    const toDomain = data.map((item: TPersistence) =>
      this.mapperToDomain.build(item)
    ) as TDomain[];

    return PaginatedResult.create(toDomain, criteria.getPagination(), total);
  }

  async findById(id: string): Promise<TDomain | null> {
    const data = await (this.context[this.model] as any).findUnique({
      where: { id },
      include: this.includes,
    });

    return data ? this.mapperToDomain.build(data) : null;
  }

  async exists(id: string): Promise<boolean> {
    return (
      (await (this.context[this.model] as any).count({
        where: { id },
      })) > 0
    );
  }

  async delete(entity: TDomain): Promise<void> {
    await (this.context[this.model] as any).delete({
      where: { id: entity.id },
    });
  }

  async create(entity: TDomain) {
    const data = this.mapperToPersistence.build(entity);

    return (this.context[this.model] as any).create({
      data,
    });
  }

  async update(entity: TDomain) {
    const data = this.mapperToPersistence.build(entity);
    return (this.context[this.model] as any).update({
      where: { id: entity.id },
      data,
    });
  }

  protected applyCriteria(criteria: Criteria) {
    const where: any = {};
    const args: {
      where: any;
      take: number | undefined;
      skip: number | undefined;
      orderBy: { [key: string]: "asc" | "desc" }[] | undefined;
    } = {
      where,
      take: undefined,
      skip: undefined,
      orderBy: undefined,
    };

    for (const filter of criteria.getFilters()) {
      const { field, operator, value } = filter;

      switch (operator) {
        case "equals":
          where[field] = value;
          break;

        case "notEquals":
          where[field] = { not: String(value) };
          break;

        case "contains":
          where[field] = { contains: String(value), mode: "insensitive" };
          break;

        case "startsWith":
          where[field] = { startsWith: String(value) };
          break;

        case "endsWith":
          where[field] = { endsWith: String(value) };
          break;

        case "greaterThan":
          where[field] = { gt: value };
          break;

        case "greaterThanOrEqual":
          where[field] = { gte: value };
          break;

        case "lessThan":
          where[field] = { lt: value };
          break;

        case "lessThanOrEqual":
          where[field] = { lte: value };
          break;

        case "between":
          where[field] = {
            gte: (value as number[])[0],
            lte: (value as number[])[1],
          };
          break;

        case "in":
          where[field] = { in: value };
          break;

        case "notIn":
          where[field] = { notIn: value };
          break;

        case "isNull":
          where[field] = null;
          break;

        case "isNotNull":
          where[field] = { not: null };
          break;
      }
    }

    if (criteria.hasSearch()) {
      const { fields, value } = criteria.getSearch()!;
      const or = fields.map((f) => buildNestedContains(f, value));

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

    const p = criteria.getPagination();
    if (p) {
      args.skip = p.offset;
      args.take = p.limit;
    }

    return args;
  }
}

function buildNestedContains(path: string, value: string) {
  const parts = path.split(".");
  const last = parts.pop()!;

  let node: any = {
    [last]: { contains: value, mode: "insensitive" },
  };

  for (let i = parts.length - 1; i >= 0; i--) {
    node = { [parts[i] as string]: node };
  }

  return node;
}
