import { Primitive } from "./utils";

export const FILTER_OPERATORS = [
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "contains",
  "startsWith",
  "endsWith",
  "in",
  "notIn",
  "between",
  "isNull",
  "isNotNull",
] as const;

export type FilterValueFor<T> =
  | T // equals, notEquals
  | (T extends number | Date
      ? [T, T] // between
      : never)
  | T[] // in, notIn
  | null;

export type PathValue<
  T,
  P extends string
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export interface Filter<TField = string, TValue = unknown> {
  field: TField;
  operator: FilterOperator;
  value: TValue;
}

export type TypedFilter<T> = {
  [K in FieldPath<T>]: Filter<K, FilterValueFor<PathValue<T, K>>>;
}[FieldPath<T>];

export type OrderDirection = "asc" | "desc";

export interface Order {
  field: string;
  direction: OrderDirection;
}

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

export interface Search<T> {
  fields: FieldPath<T>[];
  value: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

type ExcludeBuiltInKeys<T> = Exclude<
  keyof T,
  keyof any[] | number | symbol
>;

export type FieldPath<T> = T extends Primitive
  ? never
  : {
      [K in ExcludeBuiltInKeys<T> & string]: NonNullable<T[K]> extends Primitive
        ? K
        : NonNullable<T[K]> extends Array<infer U>
        ? U extends Primitive
          ? K
          : K | `${K}.${FieldPath<U>}`
        : K | `${K}.${FieldPath<NonNullable<T[K]>>}`;
    }[ExcludeBuiltInKeys<T> & string];
