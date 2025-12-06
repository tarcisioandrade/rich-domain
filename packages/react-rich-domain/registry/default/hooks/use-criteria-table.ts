import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useCriteria } from "./use-criteria";
import { useDebounceCallback } from "./use-debounce-callback";
import type {
  UseCriteriaTableOptions,
  UseCriteriaTableReturn,
} from "../types/use-criteria-table.type";
import type { FieldPath, OrderDirection } from "@woltz/rich-domain";

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
    enableMultiSort = false,
    searchDebounceMs = 300,
  } = options;

  // Initialize useCriteria for state management
  const criteriaState = useCriteria<T>(criteriaOptions);

  // Debounced search that updates criteria
  const [debouncedSetSearch] = useDebounceCallback((value: string) => {
    criteriaState.setSearch(value);
  }, searchDebounceMs);

  // Handle search change with debounce
  const handleSearchChange = useCallback(
    (value: string) => {
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  // Fetch data using React Query
  const query = useQuery({
    queryKey: [...queryKey, criteriaState.criteria.toJSON()],
    queryFn: () => queryFn(criteriaState.criteria),
  });

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Convert criteria sorting to TanStack Table format
  const sorting: SortingState = useMemo(() => {
    return criteriaState.sorting.map((order) => ({
      id: order.field,
      desc: order.direction === "desc",
    }));
  }, [criteriaState.sorting]);

  // Handle sorting changes from TanStack Table
  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;

      if (newSorting.length === 0) {
        criteriaState.clearSort();
        return;
      }

      // For single sort, just use the first item
      const sortItem = newSorting[0];
      if (!sortItem) return;

      const direction: OrderDirection = sortItem.desc ? "desc" : "asc";
      criteriaState.addSort(sortItem.id as FieldPath<T>, direction);
    },
    [sorting, criteriaState]
  );

  // Pagination state from criteria
  const paginationState: PaginationState = useMemo(() => {
    return {
      pageIndex: criteriaState.pagination.page - 1, // TanStack uses 0-based index
      pageSize: criteriaState.pagination.limit,
    };
  }, [criteriaState.pagination]);

  // Handle pagination changes from TanStack Table
  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const newPagination =
        typeof updater === "function" ? updater(paginationState) : updater;

      // Update page if changed
      if (newPagination.pageIndex !== paginationState.pageIndex) {
        criteriaState.setPage(newPagination.pageIndex + 1); // Convert back to 1-based
      }

      // Update page size if changed
      if (newPagination.pageSize !== paginationState.pageSize) {
        criteriaState.setPageSize(newPagination.pageSize);
      }
    },
    [paginationState, criteriaState]
  );

  // Calculate page count from query meta
  const pageCount = useMemo(() => {
    return query.data?.meta.totalPages ?? -1;
  }, [query.data?.meta.totalPages]);

  // Initialize TanStack Table
  const table = useReactTable({
    data: query.data?.data ?? [],
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
    enableMultiSort,
    pageCount,

    // Merge additional table options
    ...tableOptions,
  });

  // Sync TanStack Table state back to URL/storage when criteria changes
  useEffect(() => {
    // This effect ensures criteria persistence is triggered
    // The actual persistence is handled by useCriteria
  }, [criteriaState.criteria]);

  // Filter props for Filter component integration
  const filterProps = useMemo(
    () => ({
      fields: filterFields,
      filters: criteriaState.filters,
      addOrReplaceByIndex: criteriaState.addOrReplaceByIndex,
      removeFilter: criteriaState.removeFilter,
      clearFilters: criteriaState.clearFilters,
    }),
    [
      filterFields,
      criteriaState.filters,
      criteriaState.addOrReplaceByIndex,
      criteriaState.removeFilter,
      criteriaState.clearFilters,
    ]
  );

  // Search props for DataTableCriteria integration
  const searchProps = useMemo(
    () => ({
      searchValue: criteriaState.search || "",
      onSearchChange: handleSearchChange,
      showSearch: true,
    }),
    [criteriaState.search, handleSearchChange]
  );

  return {
    table,
    criteria: criteriaState,
    query,
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    filterProps,
    searchProps,
    sorting,
    setSorting: handleSortingChange,
  };
}
