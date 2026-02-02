import { useCallback, useMemo, useState } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCriteria } from "./use-criteria";
import { useDebounceCallback } from "./use-debounce-callback";
import type {
  CriteriaTable,
  UseCriteriaTableOptions,
  UseCriteriaTableReturn,
} from "../types/use-criteria-table.type";
import type { FieldPath, OrderDirection } from "@woltz/rich-domain";
import type { SearchIntegrationProps } from "@/components/data-view-criteria/data-view-filter/data-view-filter";

export function useCriteriaTable<T>(
  options: UseCriteriaTableOptions<T>
): UseCriteriaTableReturn<T> {
  const {
    columns,
    filterFields = [],
    queryKey,
    queryFn,
    criteriaOptions = {},
    tableOptions = {},
    enableRowSelection = false,
    searchOptions,
    queryOptions = {},
  } = options;
  const criteriaState = useCriteria<T>(criteriaOptions);
  const { searchDebounceMs = 300, searchPlaceholder = "Search..." } =
    searchOptions ?? {};

  const [debouncedSetSearch] = useDebounceCallback((value: string) => {
    criteriaState.setSearch(value);
  }, searchDebounceMs);

  const handleSearchChange = useCallback(
    (value: string) => {
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  const query = useQuery({
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
    queryKey: [...queryKey, criteriaState.criteria.toJSON()],
    queryFn: async () => await queryFn(criteriaState.criteria),
  });

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const sorting: SortingState = useMemo(() => {
    return criteriaState.sorting.map((order) => ({
      id: order.field,
      desc: order.direction === "desc",
    }));
  }, [criteriaState.sorting]);

  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;

      if (newSorting.length === 0) {
        criteriaState.clearSort();
        return;
      }

      if (newSorting.length < sorting.length) {
        const removedSort = sorting.find(
          (oldSort) => !newSorting.some((newSort) => newSort.id === oldSort.id)
        );
        if (removedSort) {
          criteriaState.removeSortByField(removedSort.id as FieldPath<T>);
        }
        return;
      }

      for (const newSort of newSorting) {
        const oldSort = sorting.find((s) => s.id === newSort.id);
        const direction: OrderDirection = newSort.desc ? "desc" : "asc";

        if (!oldSort || oldSort.desc !== newSort.desc) {
          criteriaState.addSort(newSort.id as FieldPath<T>, direction);
        }
      }
    },
    [sorting, criteriaState]
  );

  const paginationState: PaginationState = useMemo(() => {
    return {
      pageIndex: criteriaState.pagination.page - 1, // TanStack uses 0-based index
      pageSize: criteriaState.pagination.limit,
    };
  }, [criteriaState.pagination]);

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const newPagination =
        typeof updater === "function" ? updater(paginationState) : updater;

      if (newPagination.pageIndex !== paginationState.pageIndex) {
        criteriaState.setPage(newPagination.pageIndex + 1); // Convert back to 1-based
      }

      if (newPagination.pageSize !== paginationState.pageSize) {
        criteriaState.setPageSize(newPagination.pageSize);
      }
    },
    [paginationState, criteriaState]
  );

  const pageCount = useMemo(() => {
    return query.data?.meta.totalPages ?? -1;
  }, [query.data?.meta.totalPages]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: (query.data?.data as T[]) ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),

    // Manual pagination and sorting (controlled by criteria)
    manualPagination: true,
    manualSorting: true,

    // State
    state: {
      sorting,
      pagination: paginationState,
      columnVisibility,
    },

    // Handlers
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
    onColumnVisibilityChange: setColumnVisibility,

    // Config
    enableRowSelection,
    enableMultiSort: true,
    pageCount,

    // Merge additional table options
    ...tableOptions,
  });

  const searchProps: SearchIntegrationProps = useMemo(
    () => ({
      searchValue: criteriaState.search || "",
      onSearchChange: handleSearchChange,
      showSearch: true,
      searchPlaceholder,
    }),
    [criteriaState.search, handleSearchChange, searchPlaceholder]
  );

  const newTable: CriteriaTable<T> = Object.assign(table, {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    queryFilter: filterFields,
    searchProps,
    data: query.data,
  });

  return {
    table: newTable,
    criteria: criteriaState,
    query,
    sorting,
    setSorting: handleSortingChange,
  };
}
