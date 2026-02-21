import { InvalidCriteriaError } from "./exceptions.js";
import {
  CriteriaAdapter,
  CriteriaOptions,
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
  TypedOrder,
} from "./types/index.js";
import {
  isValidOperatorForType,
  getValidOperatorsForType,
  sanitizeFieldValue,
  isOperator,
} from "./utils/criteria-operator-validation.js";
import { parseQueryValue } from "./utils/helpers.js";

export class Criteria<T = any> {
  private _filters: Filter<FieldPath<T>, any>[] = [];
  private _orders: Order[] = [];
  private _pagination: Pagination = { page: 1, limit: 20, offset: 0 };
  private _search?: Search;
  private _adapter?: CriteriaAdapter<any, any>;

  private constructor() {}

  static create<T = any>(): Criteria<T> {
    return new Criteria<T>();
  }

  useAdapter<A extends CriteriaAdapter<any, any>>(map: A): this {
    this._adapter = map;
    return this;
  }

  getAdapter(): CriteriaAdapter<any, any> | undefined {
    return this._adapter;
  }

  where<K extends FieldPath<T>>(
    field: K,
    operator: OperatorsForType<NonNullable<PathValue<T, K>>>,
    value?: FilterValueFor<PathValue<T, K>>,
    options?: CriteriaOptions
  ): this;

  where<K extends FieldPath<T>>(
    field: K,
    operator: FilterOperator,
    value?: FilterValueFor<PathValue<T, K>>,
    options?: CriteriaOptions
  ): this {
    this.validateOperator(operator, value);

    this._filters.push({
      field: this.resolveFieldPath(field),
      operator,
      value,
      options,
    });
    return this;
  }

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

  whereSome<K extends FieldPath<T>>(
    field: K,
    operator: OperatorsForType<NonNullable<PathValue<T, K>>>,
    value?: FilterValueFor<PathValue<T, K>>
  ): this {
    return this.where(field, operator, value, { quantifier: "some" });
  }

  whereEvery<K extends FieldPath<T>>(
    field: K,
    operator: OperatorsForType<NonNullable<PathValue<T, K>>>,
    value?: FilterValueFor<PathValue<T, K>>
  ): this {
    return this.where(field, operator, value, { quantifier: "every" });
  }

  whereNone<K extends FieldPath<T>>(
    field: K,
    operator: OperatorsForType<NonNullable<PathValue<T, K>>>,
    value?: FilterValueFor<PathValue<T, K>>
  ): this {
    return this.where(field, operator, value, { quantifier: "none" });
  }

  orderBy<K extends FieldPath<T>>(
    field: K,
    direction: OrderDirection = "asc"
  ): this {
    this._orders.push({
      field: this.resolveFieldPath(field),
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

  search(value: string): this {
    this._search = value;
    return this;
  }

  hasSearch(): boolean {
    return !!this._search;
  }

  getSearch(): Search | undefined {
    return this._search;
  }

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

  getFilters(): Filter[] {
    return this._filters.map((filter) => ({
      field: this.resolveFieldPath(filter.field),
      operator: filter.operator,
      value: filter.value,
      options: filter.options,
    }));
  }

  getOrders(): Order[] {
    return this._orders.map((order) => ({
      field: this.resolveFieldPath(order.field as FieldPath<T>),
      direction: order.direction,
    }));
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

  clone(): Criteria<T> {
    const cloned = Criteria.create<T>();
    cloned._filters = [
      ...this._filters.map((filter) => ({
        field: this.resolveFieldPath(filter.field),
        operator: filter.operator,
        value: filter.value,
        options: filter.options,
      })),
    ];
    cloned._orders = [
      ...this._orders.map((order) => ({
        field: this.resolveFieldPath(order.field as FieldPath<T>),
        direction: order.direction,
      })),
    ];
    cloned._pagination = { ...this._pagination };
    cloned._search = this._search;

    if (this._adapter) {
      cloned.useAdapter(this._adapter);
    }

    return cloned;
  }

  toJSON() {
    return {
      filters: this._filters.map((filter) => ({
        field: this.resolveFieldPath(filter.field),
        operator: filter.operator,
        value: filter.value,
        options: filter.options,
      })),
      orders: this._orders.map((order) => ({
        field: this.resolveFieldPath(order.field as FieldPath<T>),
        direction: order.direction,
      })),
      pagination: this._pagination,
      search: this._search,
    };
  }

  static fromObject<T>(
    obj: {
      filters?: TypedFilter<T>[];
      orders?: TypedOrder<T>[];
      pagination?: Pagination;
      search?: Search;
    },
    adapter?: CriteriaAdapter<any, any>
  ): Criteria<T> {
    const criteria = Criteria.create<T>();

    if (adapter) {
      criteria.useAdapter(adapter);
    }

    if (obj.filters) {
      for (const filter of obj.filters) {
        filter.field = criteria.resolveFieldPath(filter.field);
        criteria.validateOperator(filter.operator, filter.value);
      }
      criteria._filters = [...obj.filters];
    }
    if (obj.orders)
      criteria._orders = [
        ...obj.orders.map((order) => ({
          field: criteria.resolveFieldPath(order.field as FieldPath<T>),
          direction: order.direction,
        })),
      ];
    if (obj.pagination) criteria._pagination = { ...obj.pagination };
    if (obj.search) criteria._search = obj.search;

    return criteria;
  }

  protected resolveFieldPath(field: FieldPath<T>): FieldPath<T> {
    if (!this?._adapter) return field;

    if (this._adapter[field]) {
      return this._adapter[field] as FieldPath<T>;
    }

    const parts = field.split(".");
    for (let i = parts.length; i > 0; i--) {
      const prefix = parts.slice(0, i).join(".");
      if (this._adapter[prefix]) {
        const rest = parts.slice(i).join(".");
        return rest
          ? (`${this._adapter[prefix]}.${rest}` as FieldPath<T>)
          : (this._adapter[prefix] as FieldPath<T>);
      }
    }

    return field;
  }

  static fromQueryParams<T = any>(
    query: Record<string, any> | undefined,
    adapter?: CriteriaAdapter<any, any>
  ): Criteria<T> {
    if (!query) return Criteria.create<T>();

    const criteria = Criteria.create<T>();

    if (adapter) {
      criteria.useAdapter(adapter);
    }

    for (const [key, value] of Object.entries(query)) {
      if (key === "page") {
        continue;
      }
      if (key === "limit") {
        continue;
      }

      if (key === "filters") {
        const filters: Record<string, any> = criteria.parseFilterValue(value);

        for (let [filterKey, filterValue] of Object.entries(filters)) {
          const [field, operatorWithQuantifier] = filterKey.split(":");

          if (!operatorWithQuantifier || !field) continue;

          const [operatorRaw, quantifierRaw] =
            operatorWithQuantifier.split("@");
          const operator = isOperator(operatorRaw) ? operatorRaw : null;
          if (!operator) {
            throw new InvalidCriteriaError(
              `Invalid filter operator`,
              operatorRaw
            );
          }

          const validQuantifiers = ["some", "every", "none"];
          const quantifier =
            quantifierRaw && validQuantifiers.includes(quantifierRaw)
              ? (quantifierRaw as CriteriaOptions["quantifier"])
              : undefined;

          if (quantifierRaw && !quantifier) {
            throw new InvalidCriteriaError(
              `Invalid quantifier. Valid values: ${validQuantifiers.join(
                ", "
              )}`,
              quantifierRaw
            );
          }

          const options: CriteriaOptions | undefined = quantifier
            ? { quantifier }
            : undefined;

          let parsedValue: any = filterValue;

          const resolvedField = criteria.resolveFieldPath(
            field as FieldPath<T>
          );

          if (operator === "between") {
            parsedValue = criteria
              .parseFilterValue(filterValue)
              .map((v: any) => parseQueryValue(v.trim()));

            if (parsedValue.length === 2) {
              criteria.where(
                resolvedField,
                "between" as OperatorsForType<PathValue<T, FieldPath<T>>>,
                [parsedValue[0], parsedValue[1]] as [
                  PathValue<T, FieldPath<T>>,
                  PathValue<T, FieldPath<T>>,
                ],
                options
              );
            }
            continue;
          }

          if (operator === "in" || operator === "notIn") {
            parsedValue = criteria
              .parseFilterValue(filterValue)
              .map(parseQueryValue);

            criteria.where(
              field as any,
              operator as OperatorsForType<PathValue<T, FieldPath<T>>>,
              parsedValue,
              options
            );
            continue;
          }

          const parsedFinalValue = parseQueryValue(filterValue);

          criteria.validateOperator(operator, parsedFinalValue);

          criteria.where(
            field as FieldPath<T>,
            operator as OperatorsForType<PathValue<T, FieldPath<T>>>,
            parsedFinalValue,
            options
          );
        }
      }
    }

    const page = query.page ? parseInt(query.page) : undefined;
    const limit = query.limit ? parseInt(query.limit) : undefined;

    if (page && limit) {
      criteria.paginate(page, limit);
    }

    // 1. orderBy=["field:asc","field2:desc"]
    if (query.orderBy) {
      const orderByValue = query.orderBy;

      if (
        typeof orderByValue === "string" &&
        orderByValue.trim().startsWith("[")
      ) {
        try {
          const orderArray = JSON.parse(orderByValue);
          if (Array.isArray(orderArray)) {
            orderArray.forEach((item: string) => {
              const [field, direction] = item.split(":");
              criteria.orderBy(
                field as FieldPath<T>,
                (direction as OrderDirection) || "asc"
              );
            });
          }
        } catch {
          throw new InvalidCriteriaError(
            "Invalid JSON array format for orderBy",
            orderByValue
          );
        }
      } else if (Array.isArray(orderByValue)) {
        orderByValue.forEach((item: string) => {
          const [field, direction] = item.split(":");
          criteria.orderBy(
            field as FieldPath<T>,
            (direction as OrderDirection) || "asc"
          );
        });
      }
      // 2. orderBy="field:asc,field2:desc"
      else if (typeof orderByValue === "string" && orderByValue.includes(":")) {
        const sortParts = orderByValue.split(",");
        sortParts.forEach((part: string) => {
          const [field, direction] = part.split(":");
          criteria.orderBy(
            field as FieldPath<T>,
            (direction as OrderDirection) || "asc"
          );
        });
      }
      // 3. orderBy="field" + orderDirection="asc"
      else {
        const direction = (query.orderDirection as OrderDirection) || "asc";
        criteria.orderBy(orderByValue as FieldPath<T>, direction);
      }
    }

    if (query.search && typeof query.search === "string") {
      criteria.search(query.search);
    }

    return criteria;
  }

  toQueryObject(): {
    filters?: Record<string, unknown>;
    pagination?: Pagination;
    orders?: string[];
    search?: string;
  } {
    const obj: Record<string, unknown> = {};
    const json = this.toJSON();

    if (json.filters && json.filters.length > 0) {
      const filtersObj: Record<string, unknown> = {};
      for (const filter of json.filters) {
        let filterKey = `${filter.field}:${filter.operator}`;
        if (filter.options && filter.options.quantifier) {
          filterKey += `@${filter.options.quantifier}`;
        }
        let value: string | undefined;
        if (filter.value !== undefined) {
          if (Array.isArray(filter.value)) {
            value = JSON.stringify(filter.value);
          } else {
            if (filter.value instanceof Date) {
              value = filter.value.toISOString();
            } else {
              value = String(filter.value);
            }
          }
        } else {
          value = "";
        }
        filtersObj[filterKey] = value;
      }
      obj.filters = filtersObj;
    }

    if (json.pagination) {
      obj.pagination = json.pagination;
    }

    if (json.orders && json.orders.length > 0) {
      const sortValue = json.orders.map(
        (order) => `${order.field}:${order.direction}`
      );
      obj.orderBy = sortValue;
    }

    if (json.search) {
      obj.search = json.search;
    }

    return obj;
  }

  toQueryParams() {
    const params = new URLSearchParams();
    const object = this.toQueryObject();

    if (object?.filters) {
      params.set("filters", JSON.stringify(object.filters));
    }

    if (object?.pagination) {
      params.set("page", String(object.pagination.page));
      params.set("limit", String(object.pagination.limit));
    }

    if (object?.orders) {
      params.set("orderBy", JSON.stringify(object.orders));
    }

    if (object?.search) {
      params.set("search", object.search);
    }

    return params;
  }

  private validateOperator(operator: FilterOperator, value: any): void {
    const sanitizedValue = sanitizeFieldValue(value, operator);

    if (
      sanitizedValue !== undefined &&
      !isValidOperatorForType(sanitizedValue, operator)
    ) {
      const validOps = getValidOperatorsForType(sanitizedValue);
      throw new InvalidCriteriaError(
        `Operator "${operator}" is not valid for type "${typeof sanitizedValue}". Valid operators: ${validOps.join(
          ", "
        )}`,
        operator
      );
    }
  }

  private parseFilterValue(value: any) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        throw new InvalidCriteriaError(`Invalid filter value`, value);
      }
    }
    return parseQueryValue(value);
  }
}
