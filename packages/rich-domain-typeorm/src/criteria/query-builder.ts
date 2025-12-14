import { SelectQueryBuilder, Brackets, ObjectLiteral, WhereExpressionBuilder } from "typeorm";
import { Criteria } from "@woltz/rich-domain";

/**
 * Configuration for a searchable field.
 *
 * @example
 * ```typescript
 * {
 *   field: 'email',
 *   caseSensitive: true  // Default: false
 * }
 * ```
 */
export interface SearchableFieldConfig {
  /**
   * Field name (can be nested like 'author.name')
   */
  field: string;

  /**
   * Whether the search should be case-sensitive.
   * Default: false (case-insensitive)
   */
  caseSensitive?: boolean;
}

/**
 * Type helper for searchable fields.
 *
 * Supports both direct entity fields and nested relation fields.
 * Can be a simple string (case-insensitive by default) or a config object.
 *
 * @example
 * ```typescript
 * // Simple strings (case-insensitive by default):
 * protected getSearchableFields(): SearchableField<UserEntity>[] {
 *   return ['name', 'email', 'posts.title'];
 * }
 *
 * // With configuration:
 * protected getSearchableFields(): SearchableField<UserEntity>[] {
 *   return [
 *     'name',                                    // case-insensitive
 *     { field: 'email', caseSensitive: false },  // case-insensitive
 *     { field: 'code', caseSensitive: true },    // case-sensitive
 *     'posts.title'                              // case-insensitive
 *   ];
 * }
 * ```
 */
export type SearchableField<T> =
  | Extract<keyof T, string>
  | `${string}.${string}`
  | SearchableFieldConfig;

/**
 * Converts rich-domain Criteria to TypeORM QueryBuilder.
 *
 * Supports:
 * - Filters (eq, ne, gt, gte, lt, lte, contains, in, notIn)
 * - Ordering (single field)
 * - Pagination (skip/take)
 *
 * @example
 * ```typescript
 * const criteria = Criteria.create<User>()
 *   .where('name', 'contains', 'John')
 *   .where('age', 'gte', 18)
 *   .orderBy('createdAt', 'desc')
 *   .paginate(1, 10);
 *
 * const qb = repository.createQueryBuilder('user');
 * TypeORMQueryBuilder.apply(qb, criteria);
 *
 * const users = await qb.getMany();
 * ```
 */
export class TypeORMQueryBuilder {
  /**
   * Apply Criteria filters, ordering, and pagination to a QueryBuilder.
   *
   * @param qb - TypeORM SelectQueryBuilder
   * @param criteria - Query criteria
   * @param alias - Entity alias in the query
   * @param searchableFields - Optional array of fields to search when criteria has search term
   */
  static apply<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    criteria: Criteria<any>,
    alias: string = "entity",
    searchableFields?: Array<string | SearchableFieldConfig>
  ): SelectQueryBuilder<T> {
    const filters = criteria.getFilters();
    this.applyFilters(qb, filters, alias);

    if (criteria.hasSearch() && searchableFields && searchableFields.length > 0) {
      const search = criteria.getSearch()!;
      this.applySearch(qb, search, searchableFields, alias);
    }

    const orders = criteria.getOrders();
    if (orders && orders.length > 0) {
      this.applyOrdering(qb, orders, alias);
    }

    const pagination = criteria.getPagination();
    if (pagination) {
      this.applyPagination(qb, pagination);
    }

    return qb;
  }

  /**
   * Apply WHERE filters to QueryBuilder.
   */
  private static applyFilters<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    filters: Array<{
      field: string;
      operator: string;
      value: any;
    }>,
    alias: string
  ): void {
    if (filters.length === 0) return;

    filters.forEach((filter, index) => {
      const paramName = `param_${filter.field}_${index}`;
      const fieldPath = `${alias}.${filter.field}`;

      const condition = this.buildCondition(
        fieldPath,
        filter.operator,
        paramName
      );

      const params = this.buildParams(paramName, filter.operator, filter.value);

      if (index === 0) {
        qb.where(condition, params);
      } else {
        qb.andWhere(condition, params);
      }
    });
  }

  /**
   * Apply search across multiple fields using OR.
   *
   * Supports both direct fields and nested relation fields.
   * Automatically creates LEFT JOINs for relation fields.
   * Supports case-sensitive and case-insensitive search.
   *
   * Combines search conditions with existing filters using AND.
   *
   * @example
   * ```typescript
   * // Case-insensitive by default (using LOWER)
   * applySearch(qb, "john", ["name", "email"], "user");
   * // Generates: WHERE ... AND (LOWER(user.name) LIKE LOWER('%john%') OR LOWER(user.email) LIKE LOWER('%john%'))
   *
   * // Case-sensitive search
   * applySearch(qb, "Code123", [{ field: "code", caseSensitive: true }], "product");
   * // Generates: WHERE ... AND (product.code LIKE '%Code123%')
   *
   * // Mixed configuration
   * applySearch(qb, "tech", [
   *   "name",                                  // case-insensitive
   *   { field: "code", caseSensitive: true }, // case-sensitive
   *   "posts.title"                            // case-insensitive
   * ], "product");
   * ```
   */
  private static applySearch<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    search: string,
    searchableFields: Array<string | SearchableFieldConfig>,
    alias: string
  ): void {
    if (!search || searchableFields.length === 0) return;

    const joinedRelations = new Set<string>();

    const normalizedFields = searchableFields.map((field) => {
      if (typeof field === 'string') {
        return { field, caseSensitive: false };
      }
      return { ...field, caseSensitive: field.caseSensitive ?? false };
    });

    normalizedFields.forEach((config) => {
      if (config.field.includes('.')) {
        const [relation] = config.field.split('.');
        if (!joinedRelations.has(relation)) {
          qb.leftJoin(`${alias}.${relation}`, relation);
          joinedRelations.add(relation);
        }
      }
    });

    qb.andWhere(
      new Brackets((subQb: WhereExpressionBuilder) => {
        normalizedFields.forEach((config, index) => {
          const paramName = `search_${config.field.replace(/\./g, '_')}_${index}`;
          const fieldPath = config.field.includes('.')
            ? config.field
            : `${alias}.${config.field}`;
          let condition: string;
          let params: Record<string, any>;

          if (config.caseSensitive) {
            condition = `${fieldPath} LIKE :${paramName}`;
            params = { [paramName]: `%${search}%` };
          } else {
            condition = `LOWER(${fieldPath}) LIKE LOWER(:${paramName})`;
            params = { [paramName]: `%${search}%` };
          }

          if (index === 0) {
            subQb.where(condition, params);
          } else {
            subQb.orWhere(condition, params);
          }
        });
      })
    );
  }

  /**
   * Build SQL condition string for a filter.
   */
  private static buildCondition(
    fieldPath: string,
    operator: string,
    paramName: string
  ): string {
    switch (operator) {
      case "eq":
        return `${fieldPath} = :${paramName}`;
      case "ne":
        return `${fieldPath} != :${paramName}`;
      case "gt":
        return `${fieldPath} > :${paramName}`;
      case "gte":
        return `${fieldPath} >= :${paramName}`;
      case "lt":
        return `${fieldPath} < :${paramName}`;
      case "lte":
        return `${fieldPath} <= :${paramName}`;
      case "contains":
        return `${fieldPath} LIKE :${paramName}`;
      case "between":
        return `${fieldPath} BETWEEN :${paramName} AND :${paramName}1`;
      case "in":
        return `${fieldPath} IN (:...${paramName})`;
      case "notIn":
        return `${fieldPath} NOT IN (:...${paramName})`;
      case "isNull":
        return `${fieldPath} IS NULL`;
      case "isNotNull":
        return `${fieldPath} IS NOT NULL`;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Build parameter object for a filter.
   */
  private static buildParams(
    paramName: string,
    operator: string,
    value: any
  ): Record<string, any> {
    if (operator === "isNull" || operator === "isNotNull") {
      return {};
    }

    if (operator === "contains") {
      return { [paramName]: `%${value}%` };
    }

    if (operator === "between") {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error("Between operator requires an array with exactly two values [min, max]");
      }
      return {
        [paramName]: value[0],
        [`${paramName}1`]: value[1]
      };
    }

    if (operator === "in" || operator === "notIn") {
      return { [paramName]: Array.isArray(value) ? value : [value] };
    }

    return { [paramName]: value };
  }

  /**
   * Apply ORDER BY clause.
   */
  private static applyOrdering<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    orders: Array<{ field: string; direction: "asc" | "desc" }>,
    alias: string
  ): void {
    orders.forEach((order, index) => {
      const fieldPath = `${alias}.${order.field}`;
      const direction = order.direction.toUpperCase() as "ASC" | "DESC";

      if (index === 0) {
        qb.orderBy(fieldPath, direction);
      } else {
        qb.addOrderBy(fieldPath, direction);
      }
    });
  }

  /**
   * Apply pagination (OFFSET and LIMIT).
   */
  private static applyPagination<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    pagination: { offset: number; limit: number }
  ): void {
    qb.skip(pagination.offset).take(pagination.limit);
  }

  /**
   * Apply multiple OR conditions.
   *
   * @example
   * ```typescript
   * TypeORMQueryBuilder.applyOr(qb, 'user', [
   *   { field: 'email', operator: 'eq', value: 'test@example.com' },
   *   { field: 'username', operator: 'eq', value: 'testuser' }
   * ]);
   * // Generates: WHERE (user.email = :param0 OR user.username = :param1)
   * ```
   */
  static applyOr<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    conditions: Array<{ field: string; operator: string; value: any }>
  ): void {
    if (conditions.length === 0) return;

    qb.andWhere(
      new Brackets((subQb: WhereExpressionBuilder) => {
        conditions.forEach((condition, index) => {
          const paramName = `or_param_${condition.field}_${index}`;
          const fieldPath = `${alias}.${condition.field}`;

          const conditionStr = this.buildCondition(
            fieldPath,
            condition.operator,
            paramName
          );

          const params = this.buildParams(
            paramName,
            condition.operator,
            condition.value
          );

          if (index === 0) {
            subQb.where(conditionStr, params);
          } else {
            subQb.orWhere(conditionStr, params);
          }
        });
      })
    );
  }
}