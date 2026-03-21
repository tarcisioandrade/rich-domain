import {
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  type PointerSensorOptions,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  type InfiniteData,
  useInfiniteQuery,
  type QueryKey,
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Criteria,
  type FieldPath,
  type PaginatedJsonResult,
} from "@woltz/rich-domain";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type {
  FilterIntegrationProps,
  SearchIntegrationProps,
} from "@/components/data-view-criteria/data-view-filter/data-view-filter";
import type {
  CardMoveParams,
  KanbanColumnData,
  KanbanColumnDefinition,
  KanbanDndContextProps,
  KanbanQueryFn,
  UseCriteriaKanbanOptions,
  UseCriteriaKanbanReturn,
} from "../types/use-criteria-kanban.type";
import { generateIndexForMove } from "../utils/fractional-index";
import { useCriteria } from "./use-criteria";

type InternalCardMoveParams<T> = Omit<CardMoveParams<T>, "insertAfterId">;

type InfiniteColumnData<T> = InfiniteData<PaginatedJsonResult<T>, number>;

/**
 * Check if an element or any of its ancestors has the data-no-drag attribute
 */
function shouldHandleEvent(element: Element | null): boolean {
  let current = element;

  while (current) {
    if (current.getAttribute("data-no-drag") !== null) {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

/**
 * Custom PointerSensor that respects data-no-drag attribute
 */
class NoDragPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (
        { nativeEvent: event }: { nativeEvent: PointerEvent },
        { onActivation }: PointerSensorOptions
      ) => {
        if (
          !event.isPrimary ||
          event.button !== 0 ||
          !shouldHandleEvent(event.target as Element)
        ) {
          return false;
        }

        onActivation?.({ event });
        return true;
      },
    },
  ];
}

/**
 * Custom TouchSensor that respects data-no-drag attribute
 */
class NoDragTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: { nativeEvent: TouchEvent }) => {
        if (!shouldHandleEvent(event.target as Element)) {
          return false;
        }
        return true;
      },
    },
  ];
}

/**
 * Custom hook for managing Kanban board state with Criteria integration
 *
 * Provides:
 * - Multiple column queries with independent loading states
 * - Drag and drop integration with @dnd-kit
 * - Optimistic updates for smooth UX
 * - Filter and search integration
 * - Fully type-safe with generics
 *
 * @example
 * ```tsx
 * const columns: KanbanColumnDefinition<Task>[] = [
 *   { id: 'todo', title: 'To Do', criteria: c => c.where('status', 'equals', 'todo') },
 *   { id: 'doing', title: 'Doing', criteria: c => c.where('status', 'equals', 'doing') },
 *   { id: 'done', title: 'Done', criteria: c => c.where('status', 'equals', 'done') },
 * ];
 *
 * const kanban = useCriteriaKanban<Task>('tasks', fetchTasks, {
 *   columns,
 *   getItemId: (item) => item.id,
 *   groupField: 'status',
 *   onCardMove: async ({ cardId, toColumn }) => {
 *     await api.updateTask(cardId, { status: toColumn.id });
 *   },
 * });
 * ```
 *
 * @param queryKey - Base query key for React Query
 * @param fetcher - Function that fetches data based on criteria
 * @param options - Configuration options
 */
export function useCriteriaKanban<T>(
  queryKey: string | QueryKey,
  fetcher: KanbanQueryFn<T>,
  options: UseCriteriaKanbanOptions<T>
): UseCriteriaKanbanReturn<T> {
  const {
    columns: columnDefs,
    getItemId,
    groupField,
    filterFields = [],
    searchDebounceMs = 300,
    enableDragDrop = true,
    columnPageSize = 50,
    onCardMove,
    onMoveError,
    criteriaOptions,
  } = options;

  const queryClient = useQueryClient();
  const baseKey = useMemo(
    () => (Array.isArray(queryKey) ? queryKey : [queryKey]),
    [queryKey]
  );

  const criteriaState = useCriteria<T>({
    ...(criteriaOptions ?? {}),
    pageSize: columnPageSize,
  });

  const [searchValue, setSearchValue] = useState(() => {
    const initialSearch = criteriaState.criteria.hasSearch()
      ? criteriaState.criteria.getSearch()
      : "";
    return initialSearch ?? "";
  });

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        if (value.trim()) {
          criteriaState.setSearch(value);
        } else {
          criteriaState.clearSearch();
        }
      }, searchDebounceMs);
    },
    [criteriaState, searchDebounceMs]
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItem, setActiveItem] = useState<T | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const defaultSensors = useSensors(
    useSensor(NoDragPointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(NoDragTouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sensors = options.sensors ?? defaultSensors;

  const buildColumnCriteria = useCallback(
    (columnDef: KanbanColumnDefinition<T>, page: number = 1): Criteria<T> => {
      const globalCriteria = criteriaState.criteria;
      const baseCriteria = Criteria.create<T>();

      globalCriteria.getFilters().forEach((filter) => {
        baseCriteria.where(
          filter.field as FieldPath<T>,
          filter.operator as Parameters<typeof baseCriteria.where>[1],
          filter.value as Parameters<typeof baseCriteria.where>[2]
        );
      });

      const search = globalCriteria.getSearch();
      if (search) {
        baseCriteria.search(search);
      }

      const globalOrders = globalCriteria.getOrders();
      globalOrders.forEach((order) => {
        baseCriteria.orderBy(order.field as FieldPath<T>, order.direction);
      });

      const hasOrderSort = globalOrders.some((o) => o.field === "order");
      if (!hasOrderSort) {
        baseCriteria.orderBy("order" as FieldPath<T>, "asc");
      }

      baseCriteria.paginate(page, columnPageSize);

      return columnDef.criteria(baseCriteria);
    },
    [criteriaState.criteria, columnPageSize]
  );

  // React Query v5 does not provide a useInfiniteQueries (plural) hook.
  // Calling useInfiniteQuery inside .map() is safe here because columnDefs is
  // fixed at mount time and never changes order, so hooks are always called in
  // the same sequence across renders.
  const firstPageQueries = columnDefs.map((columnDef) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useInfiniteQuery({
      queryKey: [
        ...baseKey,
        "column",
        columnDef.id,
        criteriaState.criteria.toJSON(),
      ],
      queryFn: async ({ pageParam = 1 }) => {
        const columnCriteria = buildColumnCriteria(columnDef, pageParam);
        return fetcher(columnCriteria);
      },
      getNextPageParam: (lastPage) =>
        lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
      initialPageParam: 1,
      staleTime: 30000,
    })
  );

  const columns: KanbanColumnData<T>[] = useMemo(() => {
    return columnDefs.map((columnDef, index) => {
      const query = firstPageQueries[index];
      const allItems =
        query.data?.pages.flatMap((page) => page.data as T[]) ?? [];

      // Deduplicate items by ID to prevent duplicates from infinite scroll merge issues
      const uniqueItemsMap = new Map<string, T>();
      for (const item of allItems) {
        const itemId = getItemId(item);
        // Keep the first occurrence (or last if you prefer)
        if (!uniqueItemsMap.has(itemId)) {
          uniqueItemsMap.set(itemId, item);
        }
      }
      const deduplicatedItems = Array.from(uniqueItemsMap.values());

      const sortedItems = [...deduplicatedItems].sort((a, b) => {
        const aOrder = (a as T & { order: string }).order || "";
        const bOrder = (b as T & { order: string }).order || "";
        if (aOrder < bOrder) return -1;
        if (aOrder > bOrder) return 1;
        return 0;
      });

      const lastPage = query.data?.pages[query.data.pages.length - 1];
      const totalCount = lastPage?.meta?.total ?? 0;

      return {
        column: columnDef,
        items: sortedItems,
        totalCount,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isFetchingNextPage: query.isFetchingNextPage,
        hasNextPage: query.hasNextPage ?? false,
        fetchNextPage: () => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            query.fetchNextPage();
          }
        },
        error: query.error as Error | null,
        refetch: async () => {
          await query.refetch();
        },
      };
    });
  }, [columnDefs, firstPageQueries, getItemId]);

  const findItem = useCallback(
    (itemId: string): T | undefined => {
      for (const col of columns) {
        const item = col.items.find((i) => getItemId(i) === itemId);
        if (item) return item;
      }
      return undefined;
    },
    [columns, getItemId]
  );

  const findItemColumn = useCallback(
    (itemId: string): KanbanColumnDefinition<T> | undefined => {
      for (const col of columns) {
        const item = col.items.find((i) => getItemId(i) === itemId);
        if (item) return col.column;
      }
      return undefined;
    },
    [columns, getItemId]
  );

  const getColumn = useCallback(
    (columnId: string): KanbanColumnData<T> | undefined => {
      return columns.find((col) => col.column.id === columnId);
    },
    [columns]
  );

  const getColumnItems = useCallback(
    (columnId: string): T[] => {
      return getColumn(columnId)?.items ?? [];
    },
    [getColumn]
  );

  type MutationContext = {
    previousData: Record<string, InfiniteColumnData<T> | undefined>;
  };

  const getItemsFromInfiniteData = (
    data: InfiniteColumnData<T> | undefined
  ): T[] => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.data as T[]);
  };

  const moveMutation = useMutation<
    void,
    Error,
    InternalCardMoveParams<T>,
    MutationContext
  >({
    mutationFn: async (params) => {
      if (onCardMove) {
        const { cardId, fromColumn, toColumn, toIndex } = params;

        const fromQueryKey = [
          ...baseKey,
          "column",
          fromColumn.id,
          criteriaState.criteria.toJSON(),
        ];
        const toQueryKey = [
          ...baseKey,
          "column",
          toColumn.id,
          criteriaState.criteria.toJSON(),
        ];

        const fromData =
          queryClient.getQueryData<InfiniteColumnData<T>>(fromQueryKey);
        const toData =
          queryClient.getQueryData<InfiniteColumnData<T>>(toQueryKey);

        // Calculate insertAfterId - the ID of the item that should be ABOVE the moved item
        // Backend will query the REAL neighbors to calculate the correct order
        let insertAfterId: string | null = null;

        if (fromData && toData) {
          const fromDataItems = [...getItemsFromInfiniteData(fromData)];
          const itemIndex = fromDataItems.findIndex(
            (item) => getItemId(item as T) === cardId
          );
          if (itemIndex !== -1) {
            fromDataItems.splice(itemIndex, 1);
          }

          // Get destination items (excluding the moved item)
          const toDataItems =
            fromColumn.id === toColumn.id
              ? fromDataItems
              : [...getItemsFromInfiniteData(toData)].filter(
                  (item) => getItemId(item as T) !== cardId
                );

          const sortedItems = [...toDataItems].sort((a, b) => {
            const aOrder = (a as T & { order: string }).order || "";
            const bOrder = (b as T & { order: string }).order || "";
            if (aOrder < bOrder) return -1;
            if (aOrder > bOrder) return 1;
            return 0;
          });

          // If toIndex > 0, insertAfterId is the ID of the item at position (toIndex - 1)
          // If toIndex === 0, insertAfterId is null (insert at top)
          if (toIndex > 0 && sortedItems.length > 0) {
            const insertAfterIndex = Math.min(
              toIndex - 1,
              sortedItems.length - 1
            );
            insertAfterId = getItemId(sortedItems[insertAfterIndex] as T);
          }
        }

        await onCardMove({
          ...params,
          insertAfterId,
        } as CardMoveParams<T>);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: baseKey });

      const previousData: Record<string, InfiniteColumnData<T> | undefined> =
        {};

      for (const colDef of columnDefs) {
        const queryKey = [
          ...baseKey,
          "column",
          colDef.id,
          criteriaState.criteria.toJSON(),
        ];
        previousData[colDef.id] =
          queryClient.getQueryData<InfiniteColumnData<T>>(queryKey);
      }

      return { previousData };
    },
    onError: (error, params, context) => {
      if (context?.previousData) {
        for (const colDef of columnDefs) {
          const queryKey = [
            ...baseKey,
            "column",
            colDef.id,
            criteriaState.criteria.toJSON(),
          ];
          const previousColData = context.previousData[colDef.id];
          if (previousColData) {
            queryClient.setQueryData(queryKey, previousColData);
          }
        }
      }

      onMoveError?.(error, params as CardMoveParams<T>);
    },
    onSettled: (_data, _error, variables) => {
      // Only invalidate the columns involved in the move
      const { fromColumn, toColumn } = variables;
      const columnsToInvalidate = new Set([fromColumn.id, toColumn.id]);

      setTimeout(() => {
        columnsToInvalidate.forEach((columnId) => {
          const columnQueryKey = [
            ...baseKey,
            "column",
            columnId,
            criteriaState.criteria.toJSON(),
          ];
          queryClient.invalidateQueries({ queryKey: columnQueryKey });
        });
      }, 250);
    },
  });

  // Move card programmatically
  const moveCard = useCallback(
    async (
      cardId: string,
      fromColumnId: string,
      toColumnId: string,
      toIndex: number = 0
    ): Promise<void> => {
      const item = findItem(cardId);
      const fromColumn = columnDefs.find((c) => c.id === fromColumnId);
      const toColumn = columnDefs.find((c) => c.id === toColumnId);

      if (!item || !fromColumn || !toColumn) {
        throw new Error("Invalid card move parameters");
      }

      await moveMutation.mutateAsync({
        cardId,
        item,
        fromColumn,
        toColumn,
        toIndex,
      });
    },
    [findItem, columnDefs, moveMutation]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!enableDragDrop) return;

      const { active } = event;
      setActiveId(active.id);

      const item = findItem(String(active.id));
      setActiveItem(item ?? null);
    },
    [enableDragDrop, findItem]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!enableDragDrop) return;

      const { over } = event;

      if (!over) {
        setOverColumnId(null);
        return;
      }

      const overId = String(over.id);

      // Check if over is a column
      const overColumn = columnDefs.find((c) => c.id === overId);
      if (overColumn) {
        setOverColumnId(overColumn.id);
        return;
      }

      // Check if over is a card - find its column
      const cardColumn = findItemColumn(overId);
      if (cardColumn) {
        setOverColumnId(cardColumn.id);
        return;
      }

      setOverColumnId(null);
    },
    [enableDragDrop, columnDefs, findItemColumn]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!enableDragDrop) return;

      const { active, over } = event;

      if (!over) {
        flushSync(() => {
          setActiveId(null);
          setActiveItem(null);
          setOverColumnId(null);
        });
        return;
      }

      const activeItemId = String(active.id);
      const overId = String(over.id);

      const fromColumn = findItemColumn(activeItemId);
      let toColumn: KanbanColumnDefinition<T> | undefined;
      let toIndex = 0;

      const overColumn = columnDefs.find((c) => c.id === overId);
      if (overColumn) {
        toColumn = overColumn;
        if (fromColumn?.id === overColumn.id) {
          const targetItems = getColumnItems(overColumn.id);
          const itemsWithoutActive = targetItems.filter(
            (item) => getItemId(item) !== activeItemId
          );
          toIndex = itemsWithoutActive.length;
        } else {
          toIndex = 0;
        }
      } else {
        toColumn = findItemColumn(overId);
        if (toColumn) {
          const targetItems = getColumnItems(toColumn.id);
          const itemsWithoutActive =
            fromColumn?.id === toColumn.id
              ? targetItems.filter((item) => getItemId(item) !== activeItemId)
              : targetItems;

          const overIndex = itemsWithoutActive.findIndex(
            (item) => getItemId(item) === overId
          );

          if (overIndex === -1) {
            toIndex =
              fromColumn?.id === toColumn.id ? itemsWithoutActive.length : 0;
          } else {
            if (fromColumn?.id === toColumn.id) {
              const activeIndexInFull = targetItems.findIndex(
                (item) => getItemId(item) === activeItemId
              );
              const overIndexInFull = targetItems.findIndex(
                (item) => getItemId(item) === overId
              );
              if (activeIndexInFull !== -1 && overIndexInFull !== -1) {
                const itemIds = targetItems.map((item) => getItemId(item));
                const reorderedIds = arrayMove(
                  itemIds,
                  activeIndexInFull,
                  overIndexInFull
                );
                const newActiveIndex = reorderedIds.indexOf(activeItemId);
                toIndex = newActiveIndex;
              } else {
                toIndex = overIndex;
              }
            } else {
              // When moving between columns, always insert at the top
              toIndex = 0;
            }
          }
        }
      }

      if (!fromColumn || !toColumn) {
        flushSync(() => {
          setActiveId(null);
          setActiveItem(null);
          setOverColumnId(null);
        });
        return;
      }

      if (fromColumn.id === toColumn.id && activeItemId === overId) {
        flushSync(() => {
          setActiveId(null);
          setActiveItem(null);
          setOverColumnId(null);
        });
        return;
      }

      const item = findItem(activeItemId);
      if (!item) {
        flushSync(() => {
          setActiveId(null);
          setActiveItem(null);
          setOverColumnId(null);
        });
        return;
      }

      const fromQueryKey = [
        ...baseKey,
        "column",
        fromColumn.id,
        criteriaState.criteria.toJSON(),
      ];
      const toQueryKey = [
        ...baseKey,
        "column",
        toColumn.id,
        criteriaState.criteria.toJSON(),
      ];

      const fromData =
        queryClient.getQueryData<InfiniteColumnData<T>>(fromQueryKey);
      const toData =
        queryClient.getQueryData<InfiniteColumnData<T>>(toQueryKey);

      if (fromData && toData) {
        const fromDataItems = [...getItemsFromInfiniteData(fromData)];
        const itemIndex = fromDataItems.findIndex(
          (dataItem) => getItemId(dataItem as T) === activeItemId
        );

        if (itemIndex !== -1) {
          const movedItem = fromDataItems[itemIndex];
          fromDataItems.splice(itemIndex, 1);

          // Filter out the moved item from destination column cache to prevent stale data issues
          const toDataItems =
            fromColumn.id === toColumn.id
              ? fromDataItems
              : [...getItemsFromInfiniteData(toData)].filter(
                  (dataItem) => getItemId(dataItem as T) !== activeItemId
                );

          const sortedItems = [...toDataItems].sort((a, b) => {
            const aOrder = (a as T & { order: string }).order || "";
            const bOrder = (b as T & { order: string }).order || "";
            if (aOrder < bOrder) return -1;
            if (aOrder > bOrder) return 1;
            return 0;
          });

          const newOrder = generateIndexForMove(
            sortedItems as Array<T & { order: string }>,
            toIndex
          );

          const updatedItem = {
            ...(movedItem as object),
            [groupField as string]: toColumn.value ?? toColumn.id,
            order: newOrder,
          } as T;

          if (fromColumn.id === toColumn.id) {
            // Same column reorder - preserve page structure
            const currentItems = [...getItemsFromInfiniteData(fromData)];
            const oldIndex = currentItems.findIndex(
              (dataItem) => getItemId(dataItem as T) === activeItemId
            );

            if (oldIndex !== -1) {
              const reorderedItems = arrayMove(
                currentItems,
                oldIndex,
                toIndex
              ) as T[];

              const itemIndexInReordered = reorderedItems.findIndex(
                (dataItem) => getItemId(dataItem as T) === activeItemId
              );
              if (itemIndexInReordered !== -1) {
                reorderedItems[itemIndexInReordered] = updatedItem;
              }

              // Redistribute items across existing pages to preserve structure
              let itemIndex = 0;
              const updatedPages = toData.pages.map((page) => {
                const pageSize = (page.data as T[]).length;
                const pageItems = reorderedItems.slice(
                  itemIndex,
                  itemIndex + pageSize
                );
                itemIndex += pageSize;
                return { ...page, data: pageItems as typeof page.data };
              });

              queryClient.setQueryData<InfiniteColumnData<T>>(toQueryKey, {
                ...toData,
                pages: updatedPages,
              });
            }
          } else {
            // Cross-column move - preserve page structure
            const updatedToItems = [...toDataItems] as T[];
            const insertIndex = Math.min(toIndex, updatedToItems.length);
            updatedToItems.splice(insertIndex, 0, updatedItem);

            const sortedToItems = updatedToItems.sort((a, b) => {
              const aOrder = (a as T & { order: string }).order || "";
              const bOrder = (b as T & { order: string }).order || "";
              if (aOrder < bOrder) return -1;
              if (aOrder > bOrder) return 1;
              return 0;
            });

            const sortedFromItems = fromDataItems.sort((a, b) => {
              const aOrder = (a as T & { order: string }).order || "";
              const bOrder = (b as T & { order: string }).order || "";
              if (aOrder < bOrder) return -1;
              if (aOrder > bOrder) return 1;
              return 0;
            });

            // Redistribute from items across existing pages
            let fromItemIndex = 0;
            const lastFromPage = fromData.pages[fromData.pages.length - 1];
            const updatedFromPages = fromData.pages.map((page, idx) => {
              const pageSize = (page.data as T[]).length;
              // Last page may have one less item now
              const adjustedSize =
                idx === fromData.pages.length - 1
                  ? Math.max(0, pageSize - 1)
                  : pageSize;
              const pageItems = sortedFromItems.slice(
                fromItemIndex,
                fromItemIndex + adjustedSize
              );
              fromItemIndex += adjustedSize;

              return {
                ...page,
                data: pageItems as typeof page.data,
                meta:
                  idx === fromData.pages.length - 1
                    ? {
                        ...lastFromPage.meta,
                        total: lastFromPage.meta.total - 1,
                      }
                    : page.meta,
              };
            });

            queryClient.setQueryData<InfiniteColumnData<T>>(fromQueryKey, {
              ...fromData,
              pages: updatedFromPages,
            });

            // Redistribute to items across existing pages
            let toItemIndex = 0;
            const lastToPage = toData.pages[toData.pages.length - 1];
            const updatedToPages = toData.pages.map((page, idx) => {
              const pageSize = (page.data as T[]).length;
              // First page gets one more item
              const adjustedSize = idx === 0 ? pageSize + 1 : pageSize;
              const pageItems = sortedToItems.slice(
                toItemIndex,
                toItemIndex + adjustedSize
              );
              toItemIndex += adjustedSize;

              return {
                ...page,
                data: pageItems as typeof page.data,
                meta:
                  idx === toData.pages.length - 1
                    ? { ...lastToPage.meta, total: lastToPage.meta.total + 1 }
                    : page.meta,
              };
            });

            queryClient.setQueryData<InfiniteColumnData<T>>(toQueryKey, {
              ...toData,
              pages: updatedToPages,
            });
          }
        }
      }

      flushSync(() => {
        setActiveId(null);
        setActiveItem(null);
        setOverColumnId(null);
      });

      moveMutation.mutate({
        cardId: activeItemId,
        item,
        fromColumn,
        toColumn,
        toIndex,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      enableDragDrop,
      columnDefs,
      findItemColumn,
      findItem,
      getColumnItems,
      getItemId,
      moveMutation,
      baseKey,
      criteriaState.criteria,
      queryClient,
      groupField,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveItem(null);
    setOverColumnId(null);
  }, []);

  const dndContextProps: KanbanDndContextProps = {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragCancel,
  };

  const filterProps: FilterIntegrationProps = {
    queryFilter: filterFields,
    criteria: criteriaState,
  };

  const searchProps: SearchIntegrationProps = {
    searchValue,
    onSearchChange: handleSearchChange,
    showSearch: true,
  };

  const isLoading = columns.some((col) => col.isLoading);
  const isFetching = columns.some((col) => col.isFetching);

  const refetchAll = useCallback(async () => {
    await Promise.all(columns.map((col) => col.refetch()));
  }, [columns]);

  return {
    columns,
    criteria: criteriaState,
    filterProps,
    searchProps,
    dndContextProps,
    sensors,
    activeItem,
    activeId,
    overColumnId,
    moveCard,
    moveMutation: moveMutation as unknown as UseMutationResult<
      void,
      Error,
      CardMoveParams<T>
    >,
    isLoading,
    isFetching,
    refetchAll,
    getColumnItems,
    getColumn,
    findItemColumn,
  };
}
