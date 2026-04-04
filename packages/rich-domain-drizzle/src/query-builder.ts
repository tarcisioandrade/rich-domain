import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  ilike,
  like,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  between,
  and,
  or,
  asc,
  desc,
  SQL,
} from "drizzle-orm";
import { Criteria } from "@woltz/rich-domain";
import { DrizzleAdapterError } from "./errors";

export type SearchableField<T> =
  | keyof T
  | { field: string; caseSensitive?: boolean };

type OperatorFn = (col: any, val: any) => SQL;

const OPERATOR_MAP: Record<string, OperatorFn> = {
  equals: (col, val) => eq(col, val),
  notEquals: (col, val) => ne(col, val),
  greaterThan: (col, val) => gt(col, val),
  greaterThanOrEqual: (col, val) => gte(col, val),
  lessThan: (col, val) => lt(col, val),
  lessThanOrEqual: (col, val) => lte(col, val),
  contains: (col, val) => ilike(col, `%${val}%`),
  startsWith: (col, val) => ilike(col, `${val}%`),
  endsWith: (col, val) => ilike(col, `%${val}`),
  in: (col, val) => inArray(col, val),
  notIn: (col, val) => notInArray(col, val),
  isNull: (col) => isNull(col),
  isNotNull: (col) => isNotNull(col),
  between: (col, val) => between(col, val[0], val[1]),
};

export class DrizzleQueryBuilder {
  /**
   * Apply Criteria to a Drizzle select query.
   *
   * @param criteria - The Criteria instance with filters, orders, pagination, search
   * @param table - The Drizzle table object (e.g., usersTable)
   * @param searchableFields - Fields to search when criteria.hasSearch()
   * @returns Object with { where, orderBy, limit, offset } ready for Drizzle query
   */
  static apply<T>(
    criteria: Criteria<T>,
    table: any,
    searchableFields?: SearchableField<any>[]
  ): {
    where?: SQL;
    orderBy?: SQL[];
    limit?: number;
    offset?: number;
  } {
    const result: {
      where?: SQL;
      orderBy?: SQL[];
      limit?: number;
      offset?: number;
    } = {};

    // Build filter conditions
    const filterConditions: SQL[] = [];
    for (const filter of criteria.getFilters()) {
      if (filter.field.includes(".")) {
        throw new DrizzleAdapterError(
          `Filtering on relation field "${filter.field}" is not supported. ` +
            `Drizzle requires explicit JOINs to filter across relations. ` +
            `Add a custom method to your repository using the Drizzle SQL API instead.`
        );
      }

      if (filter.options?.quantifier) {
        throw new DrizzleAdapterError(
          `Quantifier "${filter.options.quantifier}" on field "${filter.field}" is not supported. ` +
            `Drizzle does not have a built-in some/every/none operator. ` +
            `Add a custom method to your repository using EXISTS subqueries instead.`
        );
      }

      const col = DrizzleQueryBuilder.resolveColumn(table, filter.field);
      if (col === undefined) {
        throw new DrizzleAdapterError(
          `Column "${filter.field}" not found on table. ` +
            `Available columns: ${Object.keys(table)
              .filter((k) => typeof table[k] === "object")
              .join(", ")}`
        );
      }

      const operatorFn = OPERATOR_MAP[filter.operator];
      if (!operatorFn) {
        throw new DrizzleAdapterError(
          `Operator "${filter.operator}" is not supported by the Drizzle adapter.`
        );
      }

      filterConditions.push(operatorFn(col, filter.value));
    }

    // Build search conditions
    let searchCondition: SQL | undefined;
    if (
      criteria.hasSearch() &&
      searchableFields &&
      searchableFields.length > 0
    ) {
      const search = criteria.getSearch()!;
      const searchConditions: SQL[] = [];

      for (const searchField of searchableFields) {
        let fieldName: string;
        let caseSensitive = false;

        if (typeof searchField === "object" && "field" in searchField) {
          fieldName = searchField.field;
          caseSensitive = searchField.caseSensitive ?? false;
        } else {
          fieldName = String(searchField);
        }

        if (fieldName.includes(".")) {
          throw new DrizzleAdapterError(
            `Search field "${fieldName}" references a relation. ` +
              `Drizzle does not support cross-table search via Criteria. ` +
              `Use only top-level columns in getSearchableFields().`
          );
        }

        const col = DrizzleQueryBuilder.resolveColumn(table, fieldName);
        if (col === undefined) {
          throw new DrizzleAdapterError(
            `Search field "${fieldName}" not found on table. ` +
              `Available columns: ${Object.keys(table)
                .filter((k) => typeof table[k] === "object")
                .join(", ")}`
          );
        }

        if (caseSensitive) {
          searchConditions.push(like(col, `%${search}%`));
        } else {
          searchConditions.push(ilike(col, `%${search}%`));
        }
      }

      if (searchConditions.length > 0) {
        searchCondition =
          searchConditions.length === 1
            ? searchConditions[0]
            : or(...searchConditions)!;
      }
    }

    // Combine filter and search conditions
    if (filterConditions.length > 0 || searchCondition) {
      const allConditions: SQL[] = [...filterConditions];
      if (searchCondition) allConditions.push(searchCondition);

      if (allConditions.length === 1) {
        result.where = allConditions[0];
      } else {
        result.where = and(...allConditions)!;
      }
    }

    // Build order conditions
    const orders = criteria.getOrders();
    if (orders.length > 0) {
      result.orderBy = orders.map((o) => {
        if (o.field.includes(".")) {
          throw new DrizzleAdapterError(
            `Ordering by relation field "${o.field}" is not supported. ` +
              `Drizzle requires explicit JOINs to order across relations. ` +
              `Add a custom method to your repository using the Drizzle SQL API instead.`
          );
        }

        const col = DrizzleQueryBuilder.resolveColumn(table, o.field);
        if (col === undefined) {
          throw new DrizzleAdapterError(
            `Order field "${o.field}" not found on table. ` +
              `Available columns: ${Object.keys(table)
                .filter((k) => typeof table[k] === "object")
                .join(", ")}`
          );
        }

        return o.direction === "desc" ? desc(col) : asc(col);
      });
    }

    // Build pagination
    const pagination = criteria.getPagination();
    if (pagination) {
      result.limit = pagination.limit;
      result.offset = pagination.offset;
    }

    return result;
  }

  static resolveColumn(table: any, fieldPath: string): any {
    return table[fieldPath];
  }
}
