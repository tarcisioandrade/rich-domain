import type {
  Criteria,
  FieldPath,
  Filter,
  Order,
  OrderDirection,
  Pagination,
  Search,
  FilterValueFor,
  PathValue,
  OperatorsForType,
} from "@woltz/rich-domain";

/**
 * Configuration options for useCriteria hook
 */
export interface UseCriteriaOptions<T> {
  /**
   * Initial page number (default: 1)
   */
  initialPage?: number;

  /**
   * Items per page (default: 20)
   */
  pageSize?: number;

  /**
   * Initial filters to apply
   */
  initialFilters?: Filter<FieldPath<T>, unknown>[];

  /**
   * Initial sorting
   */
  initialSort?: Order[];

  /**
   * Initial search configuration
   */
  initialSearch?: Search<T>;

  /**
   * Callback fired when criteria changes
   */
  onChange?: (criteria: Criteria<T>) => void;

  /**
   * Enable persistence in localStorage
   */
  persistKey?: string;

  /**
   * Enable persistence in URL query params
   */
  syncWithUrl?: boolean;
}

/**
 * Return type for useCriteria hook
 */
export interface UseCriteriaReturn<T> {
  /**
   * Current criteria instance
   */
  criteria: Criteria<T>;

  /**
   * Current filters
   */
  filters: Array<Filter<string, unknown>>;

  /**
   * Current sorting
   */
  sorting: Order[];

  /**
   * Current pagination state
   */
  pagination: Pagination;

  /**
   * Current search state
   */
  search: Search<T> | null;

  /**
   * Add a filter. If a filter for the same field exists, it will be replaced.
   */
  addFilter: <K extends FieldPath<T>>(
    field: K,
    operator: OperatorsForType<PathValue<T, K>>,
    value?: FilterValueFor<PathValue<T, K>>
  ) => void;

  /**
   * Remove a filter by index
   */
  removeFilter: (index: number) => void;

  /**
   * Remove a filter by field name
   */
  removeFilterByField: (field: FieldPath<T>) => void;

  /**
   * Clear all filters
   */
  clearFilters: () => void;

  /**
   * Add sorting. If sorting for the same field exists, it will be replaced.
   */
  addSort: (field: FieldPath<T>, direction?: OrderDirection) => void;

  /**
   * Get filter by field name
   */
  getFilterByField: <K extends FieldPath<T>> (
    field: K
  ) => Filter<string, FilterValueFor<PathValue<T, K>>> | undefined;

  /**
   * Get sort by field name
   */
  getSortByField: <K extends FieldPath<T>>(
    field: K
  ) => Order | undefined;

  /**
   * Remove sort by index
   */
  removeSort: (index: number) => void;

  /**
   * Remove sort by field name
   */
  removeSortByField: (field: FieldPath<T>) => void;

  /**
   * Clear all sorting
   */
  clearSort: () => void;

  /**
   * Set page number
   */
  setPage: (page: number) => void;

  /**
   * Set page size (resets to page 1)
   */
  setPageSize: (size: number) => void;

  /**
   * Go to next page
   */
  nextPage: () => void;

  /**
   * Go to previous page
   */
  prevPage: () => void;

  /**
   * Set search
   */
  setSearch: (fields: FieldPath<T>[], value: string) => void;

  /**
   * Clear search
   */
  clearSearch: () => void;

  /**
   * Reset to initial state
   */
  reset: () => void;

  /**
   * Get current criteria as JSON
   */
  toJSON: () => ReturnType<Criteria<T>["toJSON"]>;

  /**
   * Clone current criteria
   */
  clone: () => Criteria<T>;
}
