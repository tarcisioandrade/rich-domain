import { Id } from "./id.js";
import type { Criteria } from "./criteria.js";
import type { Pagination, PaginationMeta, Filter } from "./types/index.js";

/**
 * Infers the JSON result type from T
 * - If T has toJSON(), returns its return type
 * - Otherwise returns T as-is
 */
type InferJsonResult<T> = T extends { toJSON(): infer R } ? R : T;

/**
 * Type for the serialized result of PaginatedResult.toJSON()
 */
export type PaginatedJsonResult<T> = {
  data: InferJsonResult<T>[];
  meta: PaginationMeta;
};

export class PaginatedResult<T> {
  constructor(
    public readonly data: T[],
    public readonly meta: PaginationMeta
  ) {}

  /**
   * Creates a PaginatedResult with calculated metadata
   */
  static create<T>(
    data: T[],
    pagination: Pagination,
    total: number
  ): PaginatedResult<T> {
    const meta = this.createMeta(pagination, total);
    return new PaginatedResult(data, meta);
  }

  /**
   * Creates pagination metadata from total count
   */
  static createMeta(pagination: Pagination, total: number): PaginationMeta {
    const totalPages = Math.ceil(total / pagination.limit);

    return {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Applies criteria to an in-memory array (useful for testing)
   */
  static fromArray<T>(items: T[], criteria: Criteria<T>): PaginatedResult<T> {
    let result = [...items];
    let total = result.length;

    for (const filter of criteria.getFilters()) {
      result = result.filter((item) => applyFilter(item, filter));
      total = result.length;
    }

    for (const order of criteria.getOrders().reverse()) {
      result.sort((a, b) => {
        const aVal = getNestedValue(a, order.field);
        const bVal = getNestedValue(b, order.field);

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        return order.direction === "desc" ? -comparison : comparison;
      });
    }

    const pagination = criteria.getPagination();
    result = result.slice(
      pagination.offset,
      pagination.offset + pagination.limit
    );

    const search = criteria.getSearch();

    if (search) {
      result = result.filter((item) => {
        const values = Object.values(item as Record<string, unknown>);
        return values.some((val) =>
          String(val).toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    return PaginatedResult.create(result, pagination, total);
  }

  /**
   * Converts the result to JSON, deeply serializing all entities/aggregates/value objects
   * - Entities/Aggregates → calls toJSON() recursively
   * - Value Objects → calls toJSON()
   * - Id → converts to string
   * - Arrays → maps recursively
   * - Plain objects → serializes properties recursively
   * - Primitives → returns as-is
   */
  toJSON(): PaginatedJsonResult<T> {
    return {
      data: this.data.map((item) =>
        this.deepSerialize(item)
      ) as InferJsonResult<T>[],
      meta: this.meta,
    };
  }

  /**
   * Deep serialization logic (similar to BaseEntity.deepToJson)
   */
  private deepSerialize(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (obj instanceof Id) return obj.value;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepSerialize(item));
    }

    if (obj && typeof obj.toJSON === "function") {
      return obj.toJSON();
    }

    if (typeof obj === "object") {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = this.deepSerialize(obj[key]);
        }
      }
      return result;
    }

    return obj;
  }

  /**
   * Transform each item in the result using a mapper function
   */
  map<U>(fn: (item: T) => U): PaginatedResult<U> {
    return new PaginatedResult(this.data.map(fn), this.meta);
  }

  /**
   * Check if result has no data
   */
  get isEmpty(): boolean {
    return this.data.length === 0;
  }

  /**
   * Check if there are more pages available
   */
  get hasMore(): boolean {
    return this.meta.hasNext;
  }
}

function applyFilter<T>(item: T, filter: Filter): boolean {
  const value = getNestedValue(item, filter.field);

  const isValueDate = value instanceof Date;

  const parseValue = (v: any) => {
    if (isValueDate && typeof v === "string") return new Date(v);
    if (isValueDate && typeof v === "number") return new Date(v);
    return v;
  };

  switch (filter.operator) {
    case "equals":
      return value === filter.value;

    case "notEquals":
      return value !== filter.value;

    case "greaterThan": {
      const compareTo = parseValue(filter.value);
      return isValueDate ? value > compareTo : value > (filter.value as any);
    }

    case "greaterThanOrEqual": {
      const compareTo = parseValue(filter.value);
      return isValueDate ? value >= compareTo : value >= (filter.value as any);
    }

    case "lessThan":
      const lt = parseValue(filter.value);
      return isValueDate ? value < lt : value < (filter.value as any);

    case "lessThanOrEqual":
      const lte = parseValue(filter.value);
      return isValueDate ? value <= lte : value <= (filter.value as any);

    case "contains":
      return String(value)
        .toLowerCase()
        .includes(String(filter.value).toLowerCase());

    case "startsWith":
      return String(value)
        .toLowerCase()
        .startsWith(String(filter.value).toLowerCase());

    case "endsWith":
      return String(value)
        .toLowerCase()
        .endsWith(String(filter.value).toLowerCase());

    case "in":
      return Array.isArray(filter.value) && filter.value.includes(value);

    case "notIn":
      return Array.isArray(filter.value) && !filter.value.includes(value);

    case "between":
      if (Array.isArray(filter.value) && filter.value.length === 2) {
        const [min, max] = filter.value.map(parseValue);
        return isValueDate
          ? value >= min && value <= max
          : value >= filter.value[0] && value <= filter.value[1];
      }
      return false;

    case "isNull":
      return value === null || value === undefined;

    case "isNotNull":
      return value !== null && value !== undefined;

    default:
      return true;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, obj);
}
