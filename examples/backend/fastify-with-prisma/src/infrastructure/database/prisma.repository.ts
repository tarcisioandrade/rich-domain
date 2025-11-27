import type { PrismaClient } from "@prisma/client";
import {
  Aggregate,
  Repository,
  Mapper,
  Criteria,
  PaginatedResult,
  FilterOperator,
  CriteriaOptions,
} from "@woltz/rich-domain";
import { PrismaUnitOfWork } from "./unit-of-work";

export abstract class PrismaRepository<
  TDomain extends Aggregate<any>,
  TPersistence
> extends Repository<TDomain> {
  public readonly uow: PrismaUnitOfWork;

  constructor(
    protected readonly mapperToPersistence: Mapper<TDomain, void>,
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

  async createOrUpdate(entity: TDomain) {
    await this.mapperToPersistence.build(entity);
  }

  async update(entity: TDomain) {
    const data = this.mapperToPersistence.build(entity);
    return (this.context[this.model] as any).update({
      where: { id: entity.id },
      data,
    });
  }

  protected applyCriteria(criteria: Criteria<any>) {
    const where: any = {};
    const args: {
      where: any;
      take?: number;
      skip?: number;
      orderBy?: { [key: string]: "asc" | "desc" }[];
    } = { where };

    for (const filter of criteria.getFilters()) {
      const { field, operator, value } = filter;

      const condition = buildNestedPrismaCondition(
        field,
        operator,
        value,
        filter.options?.quantifier
      );

      mergeDeep(where, condition);
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

    const pagination = criteria.getPagination();
    if (pagination) {
      args.skip = pagination.offset;
      args.take = pagination.limit;
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
    const parent = parts[i];

    if (parent && looksLikeCollectionField(parent)) {
      node = { [parent]: { some: node } };
    } else {
      node = { [parent as string]: node };
    }
  }

  return node;
}

function buildOperatorForPrisma(operator: FilterOperator, value: any) {
  switch (operator) {
    case "equals":
      return value;

    case "notEquals":
      return { not: value };

    case "contains":
      return { contains: String(value), mode: "insensitive" };

    case "startsWith":
      return { startsWith: String(value) };

    case "endsWith":
      return { endsWith: String(value) };

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
      return { in: value, mode: "insensitive" };

    case "notIn":
      return { notIn: value, mode: "insensitive" };

    case "isNull":
      return null;

    case "isNotNull":
      return { not: null };
  }
}

function buildNestedPrismaCondition(
  fieldPath: string,
  operator: FilterOperator,
  value: any,
  quantifier?: CriteriaOptions["quantifier"]
) {
  const parts = fieldPath.split(".");
  const last = parts.pop()!;
  const leaf = buildOperatorForPrisma(operator, value);

  let node: any = { [last]: leaf };

  for (let i = parts.length - 1; i >= 0; i--) {
    const parent = parts[i];

    if (parent && looksLikeCollectionField(parent)) {
      const q = quantifier ?? "some";
      node = { [parent as string]: { [q]: node } };
    } else {
      node = { [parent as string]: node };
    }
  }

  return node;
}

function looksLikeCollectionField(field: string) {
  return field.endsWith("s");
}

function mergeDeep(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}
