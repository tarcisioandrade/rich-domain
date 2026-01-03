import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type {
  Criteria,
  FieldPath,
  Filter,
  FilterValueFor,
  OperatorsForType,
  Order,
  OrderDirection,
  Pagination,
  PathValue,
  PaginatedJsonResult,
  PaginationMeta,
} from "@woltz/rich-domain";
import { useCriteria } from "./use-criteria";
import type { UseCriteriaOptions } from "../types/use-criteria.type";

/**
 * Options for useCriteriaInfiniteQuery hook
 */
export interface UseCriteriaInfiniteQueryOptions<TData, TError = Error>
  extends UseCriteriaOptions<TData> {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnMount?: boolean | "always";
  refetchOnWindowFocus?: boolean | "always";
  refetchOnReconnect?: boolean | "always";
  retry?: boolean | number;
  retryDelay?: number | ((attempt: number) => number);
  onSuccess?: (data: PaginatedJsonResult<TData>[]) => void;
  onError?: (error: TError) => void;
}

/**
 * Return type for useCriteriaInfiniteQuery hook
 */
export interface UseCriteriaInfiniteQueryReturn<TData, TError = Error> {
  data: TData[];
  pages: PaginatedJsonResult<TData>[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: TError | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => Promise<void>;
  criteria: Criteria<TData>;
  filters: Filter<string, unknown>[];
  sorting: Order[];
  pagination: Pagination;
  addFilter: <K extends FieldPath<TData>>(
    field: K,
    operator: OperatorsForType<PathValue<TData, K>>,
    value?: FilterValueFor<PathValue<TData, K>>
  ) => void;
  removeFilter: (index: number) => void;
  removeFilterByField: (field: FieldPath<TData>) => void;
  clearFilters: () => void;
  addSort: (field: FieldPath<TData>, direction: OrderDirection) => void;
  removeSort: (index: number) => void;
  removeSortByField: (field: FieldPath<TData>) => void;
  clearSort: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setSearch: (value: string) => void;
  clearSearch: () => void;
  reset: () => void;
}

/**
 * Hook for fetching paginated data with infinite scroll using React Query's useInfiniteQuery
 *
 * This hook is specifically designed for infinite scroll scenarios where data from
 * multiple pages needs to be accumulated and displayed together.
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useCriteriaInfiniteQuery(
 *   ['users'],
 *   async (criteria) => {
 *     const url = buildUrlWithCriteria('/api/users', criteria);
 *     const res = await fetch(url);
 *     return res.json();
 *   },
 *   { pageSize: 20 }
 * );
 *
 * // data contains all items from all loaded pages
 * // Use IntersectionObserver to call fetchNextPage when scrolling
 * ```
 *
 * @param queryKey - Base query key for React Query
 * @param fetcher - Function that receives criteria and returns paginated data
 * @param options - Combined options for useCriteria and React Query
 */
export function useCriteriaInfiniteQuery<TData, TError = Error>(
  queryKey: string | readonly unknown[],
  fetcher: (criteria: Criteria<TData>) => Promise<PaginatedJsonResult<TData>>,
  options?: UseCriteriaInfiniteQueryOptions<TData, TError>
): UseCriteriaInfiniteQueryReturn<TData, TError> {
  const criteriaHook = useCriteria<TData>(options);
  const { criteria } = criteriaHook;

  const baseKey = Array.isArray(queryKey) ? queryKey : [queryKey];

  const query = useInfiniteQuery({
    queryKey: [...baseKey, criteria.toJSON()],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const pageCriteria = criteria.clone();
      pageCriteria.paginate(pageParam, criteria.getPagination().limit);
      return fetcher(pageCriteria);
    },
    getNextPageParam: (lastPage: PaginatedJsonResult<TData>) => {
      return lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
    retry: options?.retry,
    retryDelay: options?.retryDelay,
  });

  const { data, error, isSuccess } = query;

  const allData = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(
      (page: PaginatedJsonResult<TData>) => page.data as TData[]
    );
  }, [data]);

  const meta = useMemo(() => {
    if (!data?.pages || data.pages.length === 0) return undefined;
    const lastPage = data.pages[data.pages.length - 1];
    return lastPage?.meta;
  }, [data]);

  const fetchNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  if (isSuccess && data && options?.onSuccess) {
    options.onSuccess(data.pages);
  }

  if (error && options?.onError) {
    options.onError(error as TError);
  }

  return {
    data: allData,
    pages: data?.pages ?? [],
    meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    isSuccess: query.isSuccess,
    error: (query.error as TError) || null,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage,
    refetch,
    ...criteriaHook,
  };
}
