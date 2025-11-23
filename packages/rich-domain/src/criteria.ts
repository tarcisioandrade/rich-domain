import { InvalidCriteriaError } from "./exceptions";
import {
  FieldPath,
  Filter,
  FilterOperator,
  FilterValueFor,
  OperatorsForType,
  Order,
  OrderDirection,
  Pagination,
  PathValue,
  Search,
  TypedFilter,
} from "./types";
import {
  isValidOperatorForType,
  getValidOperatorsForType,
  isOperator,
} from "./utils/criteria-operator-validation";
import { parseQueryValue } from "./utils/helpers";

// ============================================================================
// Filter Types
// ============================================================================

export class Criteria<T = any> {
  private _filters: Filter<FieldPath<T>, any>[] = [];
  private _orders: Order[] = [];
  private _pagination: Pagination = { page: 1, limit: 20, offset: 0 };
  private _search?: Search<T>;

  private constructor() {}

  /**
   * Create a new Criteria instance
   */
  static create<T = any>(): Criteria<T> {
    return new Criteria<T>();
  }

  /**
   * Add a filter condition (strictly typed - autocomplete will show only valid operators for the field type)
   */
  where<K extends FieldPath<T>>(
    field: K,
    operator: OperatorsForType<NonNullable<PathValue<T, K>>>,
    value?: FilterValueFor<PathValue<T, K>>
  ): this;

  where<K extends FieldPath<T>>(
    field: K,
    operator: FilterOperator,
    value?: FilterValueFor<PathValue<T, K>>
  ): this {
    this.validateOperator(operator, value);

    this._filters.push({
      field,
      operator,
      value,
    });
    return this;
  }

  // === Shorthand methods (tipados) ===

  whereEquals<K extends FieldPath<T>>(field: K, value: PathValue<T, K>): this {
    return this.where(
      field,
      "equals" as OperatorsForType<PathValue<T, K>>,
      value
    );
  }

  whereContains<K extends FieldPath<T>>(
    field: K,
    value: PathValue<T, K>
  ): this {
    return this.where(
      field,
      "contains" as OperatorsForType<PathValue<T, K>>,
      value
    );
  }

  whereIn<K extends FieldPath<T>>(field: K, values: PathValue<T, K>[]): this {
    return this.where(field, "in" as OperatorsForType<PathValue<T, K>>, values);
  }

  whereBetween<K extends FieldPath<T>>(
    field: K,
    min: PathValue<T, K>,
    max: PathValue<T, K>
  ): this {
    return this.where(
      field,
      "between" as OperatorsForType<PathValue<T, K>>,
      [min, max] as [PathValue<T, K>, PathValue<T, K>]
    );
  }

  whereNull<K extends FieldPath<T>>(field: K): this {
    return this.where(field, "isNull" as OperatorsForType<PathValue<T, K>>);
  }

  whereNotNull<K extends FieldPath<T>>(field: K): this {
    return this.where(field, "isNotNull" as OperatorsForType<PathValue<T, K>>);
  }

  // === OrderBy ===

  orderBy<K extends FieldPath<T>>(
    field: K,
    direction: OrderDirection = "asc"
  ): this {
    this._orders.push({
      field: String(field),
      direction,
    });
    return this;
  }

  orderByAsc<K extends FieldPath<T>>(field: K): this {
    return this.orderBy(field, "asc");
  }

  orderByDesc<K extends FieldPath<T>>(field: K): this {
    return this.orderBy(field, "desc");
  }

  // --------------------------------------------------------------------------
  // Search (tipado)
  // --------------------------------------------------------------------------

  search<K extends FieldPath<T>>(fields: K[], value: string): this {
    this._search = {
      fields,
      value,
    };
    return this;
  }

  hasSearch(): boolean {
    return !!this._search;
  }

  getSearch() {
    return this._search;
  }

  // === Pagination ===

  paginate(page: number, limit: number): this {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    this._pagination = {
      page,
      limit,
      offset: (page - 1) * limit,
    };
    return this;
  }

  limit(limit: number): this {
    return this.paginate(1, limit);
  }

  // === Getters ===

  getFilters(): Filter[] {
    return this._filters;
  }

  getOrders(): Order[] {
    return this._orders;
  }

  getPagination(): Pagination {
    return this._pagination;
  }

  hasFilters(): boolean {
    return this._filters.length > 0;
  }

  hasOrders(): boolean {
    return this._orders.length > 0;
  }

  hasPagination(): boolean {
    return this._pagination !== undefined;
  }

  // === Utilities ===

  clone(): Criteria<T> {
    const cloned = Criteria.create<T>();
    cloned._filters = [...this._filters];
    cloned._orders = [...this._orders];
    cloned._pagination = { ...this._pagination };
    return cloned;
  }

  toJSON() {
    return {
      filters: this._filters,
      orders: this._orders,
      pagination: this._pagination,
      search: this._search,
    };
  }

  static fromObject<T>(obj: {
    filters?: TypedFilter<T>[];
    orders?: Order[];
    pagination?: Pagination;
    search?: { fields: FieldPath<T>[]; value: string };
  }): Criteria<T> {
    const criteria = Criteria.create<T>();

    if (obj.filters) {
      for (const filter of obj.filters) {
        criteria.validateOperator(filter.operator, filter.value);
      }
      criteria._filters = [...obj.filters];
    }
    if (obj.orders) criteria._orders = [...obj.orders];
    if (obj.pagination) criteria._pagination = { ...obj.pagination };
    if (obj.search) criteria._search = { ...obj.search };

    return criteria;
  }

  static fromQueryParams<T>(query: Record<string, any>): Criteria<T> {
    const criteria = Criteria.create<T>();

    for (const [key, value] of Object.entries(query)) {
      // Pagination
      if (key === "page") {
        continue; // We'll handle pagination after
      }
      if (key === "limit") {
        continue;
      }
      if (key === "sort") {
        continue;
      }

      const [field, operatorRaw] = key.split(":");

      if (!operatorRaw || !field) continue;
      const operator = isOperator(operatorRaw) ? operatorRaw : null;
      if (!operator) {
        throw new InvalidCriteriaError(`Invalid filter operator`, operatorRaw);
      }

      let parsedValue: any = value;

      if (operator === "between") {
        parsedValue = value
          .split(",")
          .map((v: any) => parseQueryValue(v.trim()));
        if (parsedValue.length === 2) {
          criteria.whereBetween(field as any, parsedValue[0], parsedValue[1]);
        }
        continue;
      }

      if (operator === "in" || operator === "notIn") {
        parsedValue = value.split(",").map(parseQueryValue);
        criteria.where(
          field as any,
          operator as OperatorsForType<PathValue<T, FieldPath<T>>>,
          parsedValue
        );
        continue;
      }

      const parsedFinalValue = parseQueryValue(value);

      criteria.validateOperator(operator, parsedFinalValue);

      criteria.where(
        field as FieldPath<T>,
        operator as OperatorsForType<PathValue<T, FieldPath<T>>>,
        parsedFinalValue
      );
    }

    // Pagination
    const page = query.page ? parseInt(query.page) : undefined;
    const limit = query.limit ? parseInt(query.limit) : undefined;

    if (page && limit) {
      criteria.paginate(page, limit);
    }

    // Sorting
    if (query.orderBy) {
      const sortParts = query.orderBy.split(",");
      sortParts.forEach((part: string) => {
        const [field, direction] = part.split(":");
        criteria.orderBy(
          field as FieldPath<T>,
          (direction as OrderDirection) || "asc"
        );
      });
    }

    if (query.search && query.searchFields) {
      const fields = (query.searchFields as string)
        .split(",")
        .filter(Boolean) as FieldPath<T>[];

      criteria.search(fields, query.search as string);
    }

    return criteria;
  }

  private validateOperator(operator: FilterOperator, value: any): void {
    if (value !== undefined && !isValidOperatorForType(value, operator)) {
      const validOps = getValidOperatorsForType(value);
      throw new InvalidCriteriaError(
        `Operator "${operator}" is not valid for type "${typeof value}". Valid operators: ${validOps.join(
          ", "
        )}`,
        operator
      );
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================
