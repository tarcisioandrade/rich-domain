import { Primitive } from "./utils.js";

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

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export type StringOperators =
  | "equals"
  | "notEquals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "in"
  | "notIn"
  | "isNull"
  | "isNotNull";

export type NumberOperators =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "in"
  | "notIn"
  | "between"
  | "isNull"
  | "isNotNull";

export type DateOperators =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "in"
  | "notIn"
  | "between"
  | "isNull"
  | "isNotNull";

export type BooleanOperators = "equals" | "notEquals" | "isNull" | "isNotNull";

export type ArrayOperators = "in" | "notIn" | "isNull" | "isNotNull";

export type OperatorsForType<T> = T extends string
  ? StringOperators
  : T extends number
  ? NumberOperators
  : T extends Date
  ? DateOperators
  : T extends boolean
  ? BooleanOperators
  : T extends Array<any>
  ? ArrayOperators
  : FilterOperator;

export type FilterValueFor<T> =
  | T
  | (T extends number | Date ? [T, T] : never)
  | T[]
  | null;

/**
 * Extract the plain object type from an entity
 * For entities with toJSON(), uses the return type of toJSON()
 * Otherwise, uses the type as is
 */
type ExtractPlainType<T> = T extends { toJSON(): infer R }
  ? R
  : T;

export type PathValue<
  T,
  P extends string
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof ExtractPlainType<T>
    ? ExtractPlainType<T>[K] extends Array<infer U>
      ? PathValue<U, Rest>
      : PathValue<ExtractPlainType<T>[K], Rest>
    : never
  : P extends keyof ExtractPlainType<T>
  ? ExtractPlainType<T>[P]
  : never;

export interface Filter<TField = string, TValue = unknown> {
  field: TField;
  operator: unknown extends TValue ? FilterOperator : OperatorsForType<TValue>;
  value: TValue;
  options?: CriteriaOptions;
}

export type TypedFilter<T> = {
  [K in FieldPath<T>]: {
    field: K;
    operator: OperatorsForType<NonNullable<PathValue<T, K>>>;
    value: FilterValueFor<NonNullable<PathValue<T, K>>>;
    options?: CriteriaOptions;
  };
}[FieldPath<T>];

export type CriteriaAdapter<Input, Output> = {
  [K in FieldPath<Input>]?: FieldPath<Output>;
};

export type OrderDirection = "asc" | "desc";

export interface Order {
  field: string;
  direction: OrderDirection;
}

export type TypedOrder<T> = {
  field: FieldPath<T>;
  direction: OrderDirection;
};

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

export type Search = string;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CriteriaOptions {
  quantifier?: "some" | "every" | "none";
}

type ExcludeBuiltInKeys<T> = Exclude<keyof T, keyof any[] | number | symbol>;

export type FieldPath<T> = ExtractPlainType<T> extends Primitive
  ? never
  : {
      [K in ExcludeBuiltInKeys<ExtractPlainType<T>> & string]: NonNullable<ExtractPlainType<T>[K]> extends Primitive
        ? K
        : NonNullable<ExtractPlainType<T>[K]> extends Array<infer U>
        ? U extends Primitive
          ? K
          : K | `${K}.${FieldPath<U>}`
        : `${K}.${FieldPath<NonNullable<ExtractPlainType<T>[K]>>}`;
    }[ExcludeBuiltInKeys<ExtractPlainType<T>> & string];
