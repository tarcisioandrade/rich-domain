import type {
  ColumnDef,
  SortingState,
  TableOptions,
  Table,
} from "@tanstack/react-table";
import type { Criteria, PaginatedJsonResult } from "@woltz/rich-domain";
import type { UseCriteriaOptions, UseCriteriaReturn } from "./use-criteria.type";
import type { QueryFilter } from "../lib/filter-utils";
import type { QueryKey, UseQueryResult } from "@tanstack/react-query";
import type { FilterIntegrationProps, SearchIntegrationProps } from "@/components/data-view-criteria/data-view-filter/data-view-filter";

/**
 * Configuration options for useCriteriaTable hook
 */
export interface UseCriteriaTableOptions<T> {
  /**
   * Table column definitions
   */
  columns: ColumnDef<T>[];

  /**
   * Filter field definitions for the Filter component
   */
  filterFields?: QueryFilter[];

  /**
   * Query key for React Query
   */
  queryKey: QueryKey;

  /**
   * Query function that receives criteria and returns paginated result
   */
  queryFn: (criteria: Criteria<T>) => Promise<PaginatedJsonResult<T>>;

  /**
   * Options for useCriteria hook
   */
  criteriaOptions?: UseCriteriaOptions<T>;

  /**
   * Additional options for useReactTable
   */
  tableOptions?: Partial<TableOptions<T>>;

  /**
   * Enable row selection
   */
  enableRowSelection?: boolean;

  /**
   * Enable multi-sort
   */
  enableMultiSort?: boolean;

  /**
   * Debounce delay for search input in milliseconds
   * @default 300
   */
  searchDebounceMs?: number;
}



/**
 * Return type for useCriteriaTable hook
 */
export interface UseCriteriaTableReturn<T> {
  /**
   * TanStack Table instance
   */
  table: Table<T>;

  /**
   * All criteria state and methods
   */
  criteria: UseCriteriaReturn<T>;

  /**
   * React Query result with paginated data
   */
  query: UseQueryResult<PaginatedJsonResult<T>, Error>;

  /**
   * Paginated result data (shortcut for query.data)
   */
  data?: PaginatedJsonResult<T>;

  /**
   * Loading state (shortcut for query.isLoading)
   */
  isLoading: boolean;

  /**
   * Error state (shortcut for query.error)
   */
  error: Error | null;

  /**
   * Props to spread into Filter component
   */
  filterProps: FilterIntegrationProps;

  /**
   * Props to spread into DataTableCriteria for search
   */
  searchProps: SearchIntegrationProps;

  /**
   * Current sorting state
   */
  sorting: SortingState;

  /**
   * Update sorting (syncs with criteria)
   */
  setSorting: (sorting: SortingState) => void;
}
