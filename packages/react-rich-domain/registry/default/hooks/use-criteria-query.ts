import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useCallback } from "react";
import type {
  Criteria, PaginatedJsonResult,
  PaginationMeta
} from "@woltz/rich-domain";
import { useCriteria } from "./use-criteria";
import type { UseCriteriaOptions, UseCriteriaReturn } from "../types/use-criteria.type";

/**
 * Expected response from the fetcher function (JSON format from API)
 * Compatible with PaginatedJsonResult from @woltz/rich-domain
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Options for useCriteriaQuery hook
 */
export interface UseCriteriaQueryOptions<
  TData,
  TError = Error,
> extends UseCriteriaOptions<TData> {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchInterval?: number | false;
  refetchOnMount?: boolean | "always";
  refetchOnWindowFocus?: boolean | "always";
  refetchOnReconnect?: boolean | "always";
  retry?: boolean | number;
  retryDelay?: number | ((attempt: number) => number);
  onSuccess?: (data: PaginatedJsonResult<TData>) => void;
  onError?: (error: TError) => void;
  onSettled?: (
    data: PaginatedJsonResult<TData> | undefined,
    error: TError | null
  ) => void;
  select?: (data: PaginatedJsonResult<TData>) => unknown;
}

/**
 * Return type for useCriteriaQuery hook
 */
export interface UseCriteriaQueryReturn<TData, TError = Error> {
  data: TData[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: TError | null;
  refetch: () => Promise<void>;
  criteria: UseCriteriaReturn<TData>;
}

/**
 * Hook for fetching paginated data using Criteria with React Query
 *
 * Combines useCriteria for filter/sort/pagination management with React Query
 * for data fetching, caching, and state management.
 *
 * Always uses GET requests - the fetcher decides how to encode criteria in the URL.
 *
 * @example
 * ```tsx
 * const { data, isLoading, addFilter, setPage } = useCriteriaQuery(
 *   'users',
 *   async (criteria) => {
 *     const url = buildUrlWithCriteria('/api/users', criteria);
 *     const res = await fetch(url);
 *     return res.json();
 *   },
 *   { pageSize: 10 }
 * );
 * ```
 *
 * @param queryKey - Base query key for React Query (will be combined with criteria)
 * @param fetcher - Function that receives criteria and returns paginated data (GET request)
 * @param options - Combined options for useCriteria and React Query
 */
export function useCriteriaQuery<TData, TError = Error>(
  queryKey: string | readonly unknown[],
  fetcher: (criteria: Criteria<TData>) => Promise<PaginatedJsonResult<TData>>,
  options?: UseCriteriaQueryOptions<TData, TError>
): UseCriteriaQueryReturn<TData, TError> {
  const criteriaState = useCriteria<TData>(options);

  const completeKey = [
    ...(Array.isArray(queryKey) ? queryKey : [queryKey]),
    criteriaState.criteria.toJSON(),
  ];

  const query = useQuery({
    queryKey: completeKey,
    queryFn: async () => await fetcher(criteriaState.criteria),
    enabled: options?.enabled,
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
    refetchInterval: options?.refetchInterval,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
    retry: options?.retry,
    retryDelay: options?.retryDelay,
    select: options?.select,
  } as UseQueryOptions<PaginatedJsonResult<TData>, TError>);

  const { data: queryData, error, isSuccess } = query;

  if (isSuccess && queryData && options?.onSuccess) {
    options.onSuccess(queryData);
  }

  if (error && options?.onError) {
    options.onError(error);
  }

  if (options?.onSettled) {
    options.onSettled(queryData, error);
  }

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    data: (queryData?.data as TData[]) ?? [],
    meta: queryData?.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    isError: query.isError,
    isSuccess: query.isSuccess,
    error: query.error,
    refetch,
    criteria: criteriaState,
  };
}
