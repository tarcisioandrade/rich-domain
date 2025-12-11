import { SelectQueryBuilder, Brackets, ObjectLiteral, WhereExpressionBuilder } from "typeorm";
import { Criteria } from "@woltz/rich-domain";

/**
 * Type helper for searchable fields.
 *
 * Supports both direct entity fields and nested relation fields.
 * Use this type to get autocomplete and type safety when defining searchable fields.
 *
 * @example
 * ```typescript
 * // Without typing (not recommended):
 * protected getSearchableFields(): string[] {
 *   return ['name', 'email']; // No type checking
 * }
 *
 * // With typing (recommended):
 * protected getSearchableFields(): SearchableField<UserEntity>[] {
 *   return [
 *     'name',           // ✓ Type-safe: direct field
 *     'email',          // ✓ Type-safe: direct field
 *     'posts.title',    // ✓ Nested relation field
 *     'profile.bio'     // ✓ Nested relation field
 *   ];
 * }
 * ```
 */
export type SearchableField<T> = Extract<keyof T, string> | `${string}.${string}`;

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
    searchableFields?: string[]
  ): SelectQueryBuilder<T> {
    // Apply filters
    const filters = criteria.getFilters();
    this.applyFilters(qb, filters, alias);

    // Apply search
    if (criteria.hasSearch() && searchableFields && searchableFields.length > 0) {
      const search = criteria.getSearch()!;
      this.applySearch(qb, search, searchableFields, alias);
    }

    // Apply ordering
    const orders = criteria.getOrders();
    if (orders && orders.length > 0) {
      this.applyOrdering(qb, orders, alias);
    }

    // Apply pagination
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

    // First filter uses where(), rest use andWhere()
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
   *
   * Combines search conditions with existing filters using AND.
   *
   * @example
   * ```typescript
   * // Direct fields only
   * applySearch(qb, "john", ["name", "email", "username"], "user");
   * // Generates: WHERE ... AND (user.name LIKE '%john%' OR user.email LIKE '%john%' OR user.username LIKE '%john%')
   *
   * // With nested relation fields
   * applySearch(qb, "tech", ["name", "posts.title", "profile.bio"], "user");
   * // Generates:
   * // LEFT JOIN user.posts posts
   * // LEFT JOIN user.profile profile
   * // WHERE ... AND (user.name LIKE '%tech%' OR posts.title LIKE '%tech%' OR profile.bio LIKE '%tech%')
   * ```
   */
  private static applySearch<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    search: string,
    searchableFields: string[],
    alias: string
  ): void {
    if (!search || searchableFields.length === 0) return;

    // Track which relations we've already joined to avoid duplicates
    const joinedRelations = new Set<string>();

    // First, add all necessary joins for nested fields
    searchableFields.forEach((field) => {
      if (field.includes('.')) {
        const [relation] = field.split('.');

        // Only join if we haven't already joined this relation
        if (!joinedRelations.has(relation)) {
          qb.leftJoin(`${alias}.${relation}`, relation);
          joinedRelations.add(relation);
        }
      }
    });

    // Then apply the search conditions
    qb.andWhere(
      new Brackets((subQb: WhereExpressionBuilder) => {
        searchableFields.forEach((field, index) => {
          const paramName = `search_${field.replace(/\./g, '_')}_${index}`;

          // For nested fields (e.g., "posts.title"), use the relation alias directly
          // For direct fields (e.g., "name"), use the entity alias
          const fieldPath = field.includes('.') ? field : `${alias}.${field}`;

          const condition = `${fieldPath} LIKE :${paramName}`;
          const params = { [paramName]: `%${search}%` };

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
    // NULL checks don't need parameters
    if (operator === "isNull" || operator === "isNotNull") {
      return {};
    }

    // LIKE operator needs % wildcards
    if (operator === "contains") {
      return { [paramName]: `%${value}%` };
    }

    // IN/NOT IN operators expect arrays
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