import type {
  Criteria,
  FieldPath,
  Filter,
  FilterOperator,
  Order,
  OrderDirection,
  Pagination,
  Search,
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
  initialFilters?: Array<{
    field: FieldPath<T>;
    operator: FilterOperator;
    value?: any;
  }>;

  /**
   * Initial sorting
   */
  initialSort?: Array<{
    field: FieldPath<T>;
    direction: OrderDirection;
  }>;

  /**
   * Initial search configuration
   */
  initialSearch?: {
    fields: FieldPath<T>[];
    value: string;
  };

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
  filters: Array<Filter<string, any>>;

  /**
   * Current sorting
   */
  sorting: Array<Order>;

  /**
   * Current pagination state
   */
  pagination: Pagination;

  /**
   * Current search state
   */
  search: Search<T> | null;

  /**
   * Add a filter
   */
  addFilter: (
    field: FieldPath<T>,
    operator: FilterOperator,
    value?: any
  ) => void;

  /**
   * Remove a filter by index
   */
  removeFilter: (index: number) => void;

  /**
   * Clear all filters
   */
  clearFilters: () => void;

  /**
   * Set a specific filter (replaces existing at index)
   */
  updateFilter: (
    index: number,
    field: FieldPath<T>,
    operator: FilterOperator,
    value?: any
  ) => void;

  /**
   * Add sorting
   */
  addSort: (field: FieldPath<T>, direction?: OrderDirection) => void;

  /**
   * Remove sort by index
   */
  removeSort: (index: number) => void;

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
