import type {
  ColumnDef,
  SortingState,
  TableOptions,
  Table,
} from "@tanstack/react-table";
import type { Criteria, PaginatedJsonResult } from "@woltz/rich-domain";
import type {
  UseCriteriaOptions,
  UseCriteriaReturn,
} from "./use-criteria.type";
import type { QueryFilter } from "../lib/filter-utils";
import type {
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import type { SearchIntegrationProps } from "@/components/data-view-criteria/data-view-filter/data-view-filter";

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

  searchOptions?: {
    /**
     * Debounce delay for search input in milliseconds
     * @default 300
     */
    searchDebounceMs?: number;

    /**
     * Search placeholder
     */
    searchPlaceholder?: string;
  };

  /**
   * Additional options for React Query's useQuery hook.
   * queryKey and queryFn are managed internally and will be ignored if provided.
   * @default { staleTime: 5 * 60 * 1000, placeholderData: keepPreviousData }
   */
  queryOptions?: Omit<
    UseQueryOptions<PaginatedJsonResult<T>, Error>,
    "queryKey" | "queryFn"
  >;
}

export type CriteriaTable<T> = Table<T> & {
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
  queryFilter: QueryFilter[];
  searchProps: SearchIntegrationProps;
  data?: PaginatedJsonResult<T>;
};

/**
 * Return type for useCriteriaTable hook
 */
export interface UseCriteriaTableReturn<T> {
  /**
   * TanStack Table instance
   */
  table: CriteriaTable<T>;

  /**
   * All criteria state and methods
   */
  criteria: UseCriteriaReturn<T>;

  /**
   * React Query result with paginated data
   */
  query: UseQueryResult<PaginatedJsonResult<T>, Error>;

  /**
   * Current sorting state
   */
  sorting: SortingState;

  /**
   * Update sorting (syncs with criteria)
   */
  setSorting: (sorting: SortingState) => void;
}
