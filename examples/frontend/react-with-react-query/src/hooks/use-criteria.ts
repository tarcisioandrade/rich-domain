import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Criteria,
  type FieldPath,
  type OrderDirection,
  type Filter,
  type Order,
  type FilterValueFor,
  type PathValue,
  type OperatorsForType,
  type CriteriaOptions,
  type Search,
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

export function useCriteria<T = unknown>(
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
      filters: Filter<string, unknown>[];
      orders: Order[];
      pagination: { page: number; limit: number; offset: number };
      search?: Search | null;
    }): Criteria<T> => {
      const criteria = Criteria.create<T>();

      parts.filters.forEach((f) =>
        criteria.where(
          f.field as FieldPath<T>,
          f.operator as OperatorsForType<PathValue<T, FieldPath<T>>>,
          f.value as FilterValueFor<PathValue<T, FieldPath<T>>>
        )
      );
      parts.orders.forEach((o) =>
        criteria.orderBy(o.field as FieldPath<T>, o.direction)
      );
      criteria.paginate(parts.pagination.page, parts.pagination.limit);
      if (parts.search) criteria.search(parts.search);

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
        filter.value as FilterValueFor<PathValue<T, FieldPath<T>>>
      );
    });

    initialSort.forEach((sort) => {
      criteria.orderBy(sort.field as FieldPath<T>, sort.direction);
    });

    if (initialSearch) {
      criteria.search(initialSearch);
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
      value?: FilterValueFor<PathValue<T, K>>,
      options?: CriteriaOptions
    ) => {
      setCriteria((prev) => {
        const currentFilters = prev.getFilters();

        const existingIndex = currentFilters.findIndex(
          (f) => f.field === field
        );

        let newFilters;
        if (existingIndex !== -1) {
          newFilters = [...currentFilters];
          newFilters[existingIndex] = { field, operator, value, options };
        } else {
          newFilters = [...currentFilters, { field, operator, value, options }];
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

  const addOrReplaceByIndex = useCallback(
    (props: {
      field: FieldPath<T>;
      operator: OperatorsForType<PathValue<T, FieldPath<T>>>;
      value?: FilterValueFor<PathValue<T, FieldPath<T>>>;
      options?: CriteriaOptions;
      replaceIndex?: number;
    }) => {
      const { field, operator, value, options, replaceIndex } = props;
      setCriteria((prev) => {
        const currentFilters = prev.getFilters();
        const newFilters = [...currentFilters];
        if (replaceIndex !== undefined) {
          newFilters[replaceIndex] = { field, operator, value, options };
        } else {
          newFilters.push({ field, operator, value, options });
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

  const getFilterByField = useCallback(
    <K extends FieldPath<T>>(field: K) => {
      return filters.find((f) => f.field === field) as
        | Filter<string, FilterValueFor<PathValue<T, K>>>
        | undefined;
    },
    [filters]
  );

  const getSortByField = useCallback(
    <K extends FieldPath<T>>(field: K) => {
      return sorting.find((s) => s.field === field) as Order | undefined;
    },
    [sorting]
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
    (value: string) => {
      setCriteria((prev) => {
        return buildCriteria({
          filters: prev.getFilters(),
          orders: prev.getOrders(),
          pagination: prev.getPagination(),
          search: value,
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
        filter.value as FilterValueFor<PathValue<T, FieldPath<T>>>,
        filter.options
      );
    });

    config.initialSort.forEach((sort) => {
      newCriteria.orderBy(sort.field as FieldPath<T>, sort.direction);
    });

    if (config.initialSearch) {
      newCriteria.search(config.initialSearch);
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
    addOrReplaceByIndex,
    filters,
    sorting,
    pagination,
    search,
    addFilter,
    getSortByField,
    getFilterByField,
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
