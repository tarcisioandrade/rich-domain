import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Criteria,
  type FieldPath,
  type OrderDirection,
  type Filter,
  type Order,
  type FilterValueFor,
  type PathValue,
  OperatorsForType,
} from "@woltz/rich-domain";
import type {
  UseCriteriaOptions,
  UseCriteriaReturn,
} from "../types/use-criteria.type";
import {
  loadCriteriaFromStorage,
  loadCriteriaFromUrl,
  removeCriteriaFromStorage,
  saveCriteriaToStorage,
  syncCriteriaWithUrl,
} from "../utils/persistence";

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

  const initialConfigRef = useRef({
    initialPage,
    pageSize,
    initialFilters,
    initialSort,
    initialSearch,
  });

  const buildCriteria = useCallback(
    (parts: {
      filters: Filter<string, any>[];
      orders: Order[];
      pagination: { page: number; limit: number; offset: number };
      search?: { fields: FieldPath<T>[]; value: string } | null;
    }): Criteria<T> => {
      const criteria = Criteria.create<T>();

      parts.filters.forEach((f) =>
        criteria.where(
          f.field as FieldPath<T>,
          f.operator as OperatorsForType<PathValue<T, FieldPath<T>>>,
          f.value
        )
      );
      parts.orders.forEach((o) =>
        criteria.orderBy(o.field as FieldPath<T>, o.direction)
      );
      criteria.paginate(parts.pagination.page, parts.pagination.limit);
      if (parts.search)
        criteria.search(parts.search.fields, parts.search.value);

      return criteria;
    },
    []
  );

  const createInitialCriteria = useCallback((): Criteria<T> => {
    if (syncWithUrl) {
      const fromUrl = loadCriteriaFromUrl<T>();
      if (fromUrl) return fromUrl;
    }

    if (persistKey) {
      const fromStorage = loadCriteriaFromStorage<T>(persistKey);
      if (fromStorage) return fromStorage;
    }

    const criteria = Criteria.create<T>().paginate(initialPage, pageSize);

    initialFilters.forEach((filter) => {
      criteria.where(
        filter.field,
        filter.operator as OperatorsForType<PathValue<T, FieldPath<T>>>,
        filter.value as any
      );
    });

    initialSort.forEach((sort) => {
      criteria.orderBy(sort.field as FieldPath<T>, sort.direction);
    });

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

  useEffect(() => {
    if (persistKey) {
      saveCriteriaToStorage(persistKey, criteria);
    }

    if (syncWithUrl) {
      syncCriteriaWithUrl(criteria);
    }

    onChange?.(criteria);
  }, [criteria, onChange, persistKey, syncWithUrl]);

  const filters = useMemo(() => criteria.getFilters(), [criteria]);
  const sorting = useMemo(() => criteria.getOrders(), [criteria]);
  const pagination = useMemo(() => criteria.getPagination(), [criteria]);
  const search = useMemo(() => {
    if (!criteria.hasSearch()) return null;
    return criteria.getSearch()!;
  }, [criteria]);

  const addFilter = useCallback(
    <K extends FieldPath<T>>(
      field: K,
      operator: OperatorsForType<PathValue<T, K>>,
      value?: FilterValueFor<PathValue<T, K>>
    ) => {
      setCriteria((prev) => {
        const currentFilters = prev.getFilters();

        const existingIndex = currentFilters.findIndex(
          (f) => f.field === field
        );

        let newFilters;
        if (existingIndex !== -1) {
          newFilters = [...currentFilters];
          newFilters[existingIndex] = { field, operator, value };
        } else {
          newFilters = [...currentFilters, { field, operator, value }];
        }

        return buildCriteria({
          filters: newFilters,
          orders: prev.getOrders(),
          pagination: prev.getPagination(),
          search: prev.hasSearch() ? prev.getSearch() : null,
        });
      });
    },
    [buildCriteria]
  );

  const removeFilter = useCallback(
    (index: number) => {
      setCriteria((prev) => {
        const currentFilters = prev.getFilters();
        const newFilters = currentFilters.filter((_, i) => i !== index);

        return buildCriteria({
          filters: newFilters,
          orders: prev.getOrders(),
          pagination: prev.getPagination(),
          search: prev.hasSearch() ? prev.getSearch() : null,
        });
      });
    },
    [buildCriteria]
  );

  const removeFilterByField = useCallback(
    (field: FieldPath<T>) => {
      setCriteria((prev) => {
        const currentFilters = prev.getFilters();
        const newFilters = currentFilters.filter((f) => f.field !== field);

        return buildCriteria({
          filters: newFilters,
          orders: prev.getOrders(),
          pagination: prev.getPagination(),
          search: prev.hasSearch() ? prev.getSearch() : null,
        });
      });
    },
    [buildCriteria]
  );

  const clearFilters = useCallback(() => {
    setCriteria((prev) => {
      return buildCriteria({
        filters: [],
        orders: prev.getOrders(),
        pagination: prev.getPagination(),
        search: prev.hasSearch() ? prev.getSearch() : null,
      });
    });
  }, [buildCriteria]);

  const addSort = useCallback(
    (field: FieldPath<T>, direction: OrderDirection = "asc") => {
      setCriteria((prev) => {
        const newOrders = [{ field: String(field), direction }];

        return buildCriteria({
          filters: prev.getFilters(),
          orders: newOrders,
          pagination: prev.getPagination(),
          search: prev.hasSearch() ? prev.getSearch() : null,
        });
      });
    },
    [buildCriteria]
  );

  const removeSort = useCallback(
    (index: number) => {
      setCriteria((prev) => {
        const currentOrders = prev.getOrders();
        const newOrders = currentOrders.filter((_, i) => i !== index);

        return buildCriteria({
          filters: prev.getFilters(),
          orders: newOrders,
          pagination: prev.getPagination(),
          search: prev.hasSearch() ? prev.getSearch() : null,
        });
      });
    },
    [buildCriteria]
  );

  const removeSortByField = useCallback(
    (field: FieldPath<T>) => {
      setCriteria((prev) => {
        const currentOrders = prev.getOrders();
        const newOrders = currentOrders.filter((o) => o.field !== field);

        return buildCriteria({
          filters: prev.getFilters(),
          orders: newOrders,
          pagination: prev.getPagination(),
          search: prev.hasSearch() ? prev.getSearch() : null,
        });
      });
    },
    [buildCriteria]
  );

  const clearSort = useCallback(() => {
    setCriteria((prev) => {
      return buildCriteria({
        filters: prev.getFilters(),
        orders: [],
        pagination: prev.getPagination(),
        search: prev.hasSearch() ? prev.getSearch() : null,
      });
    });
  }, [buildCriteria]);

  const setPage = useCallback(
    (page: number) => {
      setCriteria((prev) => {
        const pag = prev.getPagination();
        return buildCriteria({
          filters: prev.getFilters(),
          orders: prev.getOrders(),
          pagination: { ...pag, page, offset: (page - 1) * pag.limit },
          search: prev.hasSearch() ? prev.getSearch() : null,
        });
      });
    },
    [buildCriteria]
  );

  const setPageSize = useCallback(
    (size: number) => {
      setCriteria((prev) => {
        return buildCriteria({
          filters: prev.getFilters(),
          orders: prev.getOrders(),
          pagination: { page: 1, limit: size, offset: 0 },
          search: prev.hasSearch() ? prev.getSearch() : null,
        });
      });
    },
    [buildCriteria]
  );

  const nextPage = useCallback(() => {
    setCriteria((prev) => {
      const pag = prev.getPagination();
      const newPage = pag.page + 1;
      return buildCriteria({
        filters: prev.getFilters(),
        orders: prev.getOrders(),
        pagination: {
          ...pag,
          page: newPage,
          offset: (newPage - 1) * pag.limit,
        },
        search: prev.hasSearch() ? prev.getSearch() : null,
      });
    });
  }, [buildCriteria]);

  const prevPage = useCallback(() => {
    setCriteria((prev) => {
      const pag = prev.getPagination();
      if (pag.page > 1) {
        const newPage = pag.page - 1;
        return buildCriteria({
          filters: prev.getFilters(),
          orders: prev.getOrders(),
          pagination: {
            ...pag,
            page: newPage,
            offset: (newPage - 1) * pag.limit,
          },
          search: prev.hasSearch() ? prev.getSearch() : null,
        });
      }
      return prev;
    });
  }, [buildCriteria]);

  const setSearch = useCallback(
    (fields: FieldPath<T>[], value: string) => {
      setCriteria((prev) => {
        return buildCriteria({
          filters: prev.getFilters(),
          orders: prev.getOrders(),
          pagination: prev.getPagination(),
          search: { fields, value },
        });
      });
    },
    [buildCriteria]
  );

  const clearSearch = useCallback(() => {
    setCriteria((prev) => {
      return buildCriteria({
        filters: prev.getFilters(),
        orders: prev.getOrders(),
        pagination: prev.getPagination(),
        search: null,
      });
    });
  }, [buildCriteria]);

  const reset = useCallback(() => {
    const config = initialConfigRef.current;

    const newCriteria = Criteria.create<T>().paginate(
      config.initialPage,
      config.pageSize
    );

    config.initialFilters.forEach((filter) => {
      newCriteria.where(
        filter.field,
        filter.operator as OperatorsForType<PathValue<T, FieldPath<T>>>,
        filter.value as any
      );
    });

    config.initialSort.forEach((sort) => {
      newCriteria.orderBy(sort.field as FieldPath<T>, sort.direction);
    });

    if (config.initialSearch) {
      newCriteria.search(
        config.initialSearch.fields,
        config.initialSearch.value
      );
    }

    setCriteria(newCriteria);

    if (persistKey) {
      removeCriteriaFromStorage(persistKey);
    }
  }, [persistKey]);

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
    removeFilterByField,
    clearFilters,
    addSort,
    removeSort,
    removeSortByField,
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
