import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Criteria,
  type FieldPath,
  type FilterOperator,
  type OrderDirection,
} from "@woltz/rich-domain";
import type { UseCriteriaOptions, UseCriteriaReturn } from "../types";
import {
  loadCriteriaFromStorage,
  loadCriteriaFromUrl,
  removeCriteriaFromStorage,
  saveCriteriaToStorage,
  syncCriteriaWithUrl,
} from "../utils/persistence";

/**
 * React hook for managing DDD Criteria with filters, sorting, pagination, and search.
 *
 * @example
 * ```tsx
 * const { criteria, addFilter, setPage, filters } = useCriteria<User>({
 *   pageSize: 10,
 *   initialFilters: [
 *     { field: 'status', operator: 'equals', value: 'active' }
 *   ]
 * });
 * ```
 *
 * @template T - The domain entity type
 * @param options - Configuration options for the hook
 * @returns Object with criteria management functions and state
 */
export function useCriteria<T = any>(
  options: UseCriteriaOptions<T> = {}
): UseCriteriaReturn<T> {
  const {
    initialPage = 1,
    pageSize = 20,
    initialFilters = [],
    initialSort = [],
    initialSearch,
    onChange,
    persistKey,
    syncWithUrl = false,
  } = options;

  // Create initial criteria
  const createInitialCriteria = useCallback((): Criteria<T> => {
    // Try to load from URL first (highest priority)
    if (syncWithUrl) {
      const fromUrl = loadCriteriaFromUrl<T>();
      if (fromUrl) return fromUrl;
    }

    // Try to load from localStorage
    if (persistKey) {
      const fromStorage = loadCriteriaFromStorage<T>(persistKey);
      if (fromStorage) return fromStorage;
    }

    // Create new criteria with initial values
    const criteria = Criteria.create<T>().paginate(initialPage, pageSize);

    // Apply initial filters
    initialFilters.forEach((filter) => {
      criteria.where(filter.field, filter.operator, filter.value);
    });

    // Apply initial sorting
    initialSort.forEach((sort) => {
      criteria.orderBy(sort.field, sort.direction);
    });

    // Apply initial search
    if (initialSearch) {
      criteria.search(initialSearch.fields, initialSearch.value);
    }

    return criteria;
  }, [
    initialPage,
    pageSize,
    initialFilters,
    initialSort,
    initialSearch,
    persistKey,
    syncWithUrl,
  ]);

  const [criteria, setCriteria] = useState<Criteria<T>>(createInitialCriteria);

  // Persist criteria when it changes
  useEffect(() => {
    if (persistKey) {
      saveCriteriaToStorage(persistKey, criteria);
    }

    if (syncWithUrl) {
      syncCriteriaWithUrl(criteria);
    }

    onChange?.(criteria);
  }, [criteria, onChange, persistKey, syncWithUrl]);

  // Extract current state from criteria
  const filters = useMemo(() => criteria.getFilters(), [criteria]);
  const sorting = useMemo(() => criteria.getOrders(), [criteria]);
  const pagination = useMemo(() => criteria.getPagination(), [criteria]);
  const search = useMemo(() => {
    if (!criteria.hasSearch()) return null;
    return criteria.getSearch()!;
  }, [criteria]);

  // Filter operations
  const addFilter = useCallback(
    (field: FieldPath<T>, operator: FilterOperator, value?: any) => {
      setCriteria((prev) => {
        const cloned = prev.clone();
        cloned.where(field, operator, value);
        return cloned;
      });
    },
    []
  );

  const removeFilter = useCallback((index: number) => {
    setCriteria((prev) => {
      const cloned = prev.clone();
      const currentFilters = cloned.getFilters();
      currentFilters.splice(index, 1);
      // Recreate criteria with remaining filters
      const newCriteria = Criteria.create<T>();
      currentFilters.forEach((f) =>
        newCriteria.where<FieldPath<T>>(
          f.field as FieldPath<T>,
          f.operator,
          f.value as any
        )
      );
      cloned
        .getOrders()
        .forEach((o) =>
          newCriteria.orderBy(o.field as FieldPath<T>, o.direction)
        );
      const pag = cloned.getPagination();
      if (pag) newCriteria.paginate(pag.page, pag.limit);
      const searchData = cloned.hasSearch() ? cloned.getSearch() : null;
      if (searchData) newCriteria.search(searchData.fields, searchData.value);
      return newCriteria;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setCriteria((prev) => {
      const cloned = Criteria.create<T>();
      // Keep pagination, sorting, and search
      prev
        .getOrders()
        .forEach((o) => cloned.orderBy(o.field as FieldPath<T>, o.direction));
      const pag = prev.getPagination();
      if (pag) cloned.paginate(pag.page, pag.limit);
      const searchData = prev.hasSearch() ? prev.getSearch() : null;
      if (searchData) cloned.search(searchData.fields, searchData.value);
      return cloned;
    });
  }, []);

  const updateFilter = useCallback(
    (
      index: number,
      field: FieldPath<T>,
      operator: FilterOperator,
      value?: any
    ) => {
      setCriteria((prev) => {
        const cloned = prev.clone();
        const currentFilters = cloned.getFilters();
        if (index >= 0 && index < currentFilters.length) {
          currentFilters[index] = { field, operator, value };
          // Recreate criteria
          const newCriteria = Criteria.create<T>();
          currentFilters.forEach((f) =>
            newCriteria.where<FieldPath<T>>(
              f.field as FieldPath<T>,
              f.operator,
              f.value as any
            )
          );
          cloned
            .getOrders()
            .forEach((o) =>
              newCriteria.orderBy(o.field as FieldPath<T>, o.direction)
            );
          const pag = cloned.getPagination();
          if (pag) newCriteria.paginate(pag.page, pag.limit);
          const searchData = cloned.hasSearch() ? cloned.getSearch() : null;
          if (searchData)
            newCriteria.search(searchData.fields, searchData.value);
          return newCriteria;
        }
        return prev;
      });
    },
    []
  );

  // Sorting operations
  const addSort = useCallback(
    (field: FieldPath<T>, direction: OrderDirection = "asc") => {
      setCriteria((prev) => {
        const cloned = prev.clone();
        cloned.orderBy(field, direction);
        return cloned;
      });
    },
    []
  );

  const removeSort = useCallback((index: number) => {
    setCriteria((prev) => {
      const cloned = prev.clone();
      const currentOrders = cloned.getOrders();
      currentOrders.splice(index, 1);
      // Recreate criteria
      const newCriteria = Criteria.create<T>();
      cloned
        .getFilters()
        .forEach((f) =>
          newCriteria.where<FieldPath<T>>(
            f.field as FieldPath<T>,
            f.operator,
            f.value as any
          )
        );
      currentOrders.forEach((o) =>
        newCriteria.orderBy(o.field as FieldPath<T>, o.direction)
      );
      const pag = cloned.getPagination();
      if (pag) newCriteria.paginate(pag.page, pag.limit);
      const searchData = cloned.hasSearch() ? cloned.getSearch() : null;
      if (searchData) newCriteria.search(searchData.fields, searchData.value);
      return newCriteria;
    });
  }, []);

  const clearSort = useCallback(() => {
    setCriteria((prev) => {
      const cloned = Criteria.create<T>();
      // Keep filters, pagination, and search
      prev
        .getFilters()
        .forEach((f) =>
          cloned.where<FieldPath<T>>(
            f.field as FieldPath<T>,
            f.operator,
            f.value as any
          )
        );
      const pag = prev.getPagination();
      if (pag) cloned.paginate(pag.page, pag.limit);
      const searchData = prev.hasSearch() ? prev.getSearch() : null;
      if (searchData) cloned.search(searchData.fields, searchData.value);
      return cloned;
    });
  }, []);

  // Pagination operations
  const setPage = useCallback((page: number) => {
    setCriteria((prev) => {
      const cloned = prev.clone();
      const pag = cloned.getPagination();
      cloned.paginate(page, pag.limit);
      return cloned;
    });
  }, []);

  const setPageSize = useCallback((size: number) => {
    setCriteria((prev) => {
      const cloned = prev.clone();
      cloned.paginate(1, size); // Reset to page 1 when changing page size
      return cloned;
    });
  }, []);

  const nextPage = useCallback(() => {
    setCriteria((prev) => {
      const cloned = prev.clone();
      const pag = cloned.getPagination();
      cloned.paginate(pag.page + 1, pag.limit);
      return cloned;
    });
  }, []);

  const prevPage = useCallback(() => {
    setCriteria((prev) => {
      const cloned = prev.clone();
      const pag = cloned.getPagination();
      if (pag.page > 1) {
        cloned.paginate(pag.page - 1, pag.limit);
      }
      return cloned;
    });
  }, []);

  // Search operations
  const setSearch = useCallback((fields: FieldPath<T>[], value: string) => {
    setCriteria((prev) => {
      const cloned = prev.clone();
      cloned.search(fields, value);
      return cloned;
    });
  }, []);

  const clearSearch = useCallback(() => {
    setCriteria((prev) => {
      const cloned = Criteria.create<T>();
      // Keep filters, sorting, and pagination
      prev
        .getFilters()
        .forEach((f) =>
          cloned.where<FieldPath<T>>(
            f.field as FieldPath<T>,
            f.operator,
            f.value as any
          )
        );
      prev
        .getOrders()
        .forEach((o) => cloned.orderBy(o.field as FieldPath<T>, o.direction));
      const pag = prev.getPagination();
      if (pag) cloned.paginate(pag.page, pag.limit);
      return cloned;
    });
  }, []);

  // Utility operations
  const reset = useCallback(() => {
    const newCriteria = createInitialCriteria();
    setCriteria(newCriteria);

    if (persistKey) {
      removeCriteriaFromStorage(persistKey);
    }
  }, [createInitialCriteria, persistKey]);

  const toJSON = useCallback(() => criteria.toJSON(), [criteria]);

  const clone = useCallback(() => criteria.clone(), [criteria]);

  return {
    criteria,
    filters,
    sorting,
    pagination,
    search,
    addFilter,
    removeFilter,
    clearFilters,
    updateFilter,
    addSort,
    removeSort,
    clearSort,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    setSearch,
    clearSearch,
    reset,
    toJSON,
    clone,
  };
}
