import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import {
  useQueries,
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  type UniqueIdentifier,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import {
  Criteria,
  type FieldPath,
  type PaginatedJsonResult,
} from "@woltz/rich-domain";
import { useCriteria } from "./use-criteria";
import {
  generateIndexForMove,
  generateFractionalIndex,
} from "../utils/fractional-index";
import type {
  UseCriteriaKanbanOptions,
  UseCriteriaKanbanReturn,
  KanbanQueryFn,
  KanbanColumnData,
  KanbanColumnDefinition,
  CardMoveParams,
  KanbanDndContextProps,
} from "../types/use-criteria-kanban.type";
import type {
  FilterIntegrationProps,
  SearchIntegrationProps,
} from "@/components/data-view-criteria/data-view-filter/data-view-filter";

// Internal type for mutation that doesn't require newOrder, prevOrder, nextOrder (they're calculated internally)
type InternalCardMoveParams<T> = Omit<
  CardMoveParams<T>,
  "newOrder" | "prevOrder" | "nextOrder"
>;

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
    ...criteriaOptions
  } = options;

  const queryClient = useQueryClient();
  const baseKey = Array.isArray(queryKey) ? queryKey : [queryKey];

  // Global criteria for filters and search
  const criteriaState = useCriteria<T>({
    ...criteriaOptions,
    pageSize: columnPageSize,
  });

  // Debounced search state
  const [searchValue, setSearchValue] = useState("");
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

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Drag and drop state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItem, setActiveItem] = useState<T | null>(null);

  // Configure sensors for drag and drop
  // Uses distance-based activation (like Linear): click+release = click action,
  // click+drag (move >5px) = immediate drag
  const defaultSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
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

  // Build criteria for each column
  const buildColumnCriteria = useCallback(
    (columnDef: KanbanColumnDefinition<T>): Criteria<T> => {
      // Start with global criteria (filters and search)
      const globalCriteria = criteriaState.criteria;
      const baseCriteria = Criteria.create<T>();

      // Copy global filters
      globalCriteria.getFilters().forEach((filter) => {
        baseCriteria.where(
          filter.field as FieldPath<T>,
          filter.operator as Parameters<typeof baseCriteria.where>[1],
          filter.value as Parameters<typeof baseCriteria.where>[2]
        );
      });

      // Copy global search
      if (globalCriteria.hasSearch()) {
        baseCriteria.search(globalCriteria.getSearch()!);
      }

      // Copy global sorting
      const globalOrders = globalCriteria.getOrders();
      globalOrders.forEach((order) => {
        baseCriteria.orderBy(order.field as FieldPath<T>, order.direction);
      });

      // Always add order field as primary or secondary sort for Kanban
      // This ensures items are always sorted by their fractional index
      const hasOrderSort = globalOrders.some((o) => o.field === "order");
      if (!hasOrderSort) {
        // Add order as primary sort if no global orders, or as secondary if there are global orders
        if (globalOrders.length === 0) {
          baseCriteria.orderBy("order" as FieldPath<T>, "asc");
        } else {
          // Add as secondary sort
          baseCriteria.orderBy("order" as FieldPath<T>, "asc");
        }
      }

      // Apply pagination
      baseCriteria.paginate(1, columnPageSize);

      // Apply column-specific filter
      return columnDef.criteria(baseCriteria);
    },
    [criteriaState.criteria, columnPageSize]
  );

  // Query for each column
  const columnQueries = useQueries({
    queries: columnDefs.map((columnDef) => ({
      queryKey: [
        ...baseKey,
        "column",
        columnDef.id,
        criteriaState.criteria.toJSON(),
      ],
      queryFn: async () => {
        const columnCriteria = buildColumnCriteria(columnDef);
        return fetcher(columnCriteria);
      },
      staleTime: 30000, // 30 seconds
    })),
  });

  // Combine column data with query results
  const columns: KanbanColumnData<T>[] = useMemo(() => {
    return columnDefs.map((columnDef, index) => {
      const query = columnQueries[index];
      const rawItems = (query.data?.data as T[]) ?? [];

      // Sort items by order to ensure correct ordering
      // This is important because json-server may not sort correctly for fractional indexes
      const sortedItems = [...rawItems].sort((a, b) => {
        const aOrder = (a as T & { order: string }).order || "";
        const bOrder = (b as T & { order: string }).order || "";
        // Direct string comparison for fractional indexes (ASCII-based)
        if (aOrder < bOrder) return -1;
        if (aOrder > bOrder) return 1;
        return 0;
      });

      return {
        column: columnDef,
        items: sortedItems,
        totalCount: query.data?.meta?.total ?? 0,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error as Error | null,
        refetch: async () => {
          await query.refetch();
        },
      };
    });
  }, [columnDefs, columnQueries]);

  // Helper to find item across all columns
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

  // Find which column contains an item
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

  // Get column by ID
  const getColumn = useCallback(
    (columnId: string): KanbanColumnData<T> | undefined => {
      return columns.find((col) => col.column.id === columnId);
    },
    [columns]
  );

  // Get items for a column
  const getColumnItems = useCallback(
    (columnId: string): T[] => {
      return getColumn(columnId)?.items ?? [];
    },
    [getColumn]
  );

  // Type for mutation context
  type MutationContext = {
    previousData: Record<string, PaginatedJsonResult<T> | undefined>;
  };

  // Mutation for moving cards with optimistic updates
  // newOrder is calculated internally, not required in input
  const moveMutation = useMutation<
    void,
    Error,
    InternalCardMoveParams<T>,
    MutationContext
  >({
    mutationFn: async (params) => {
      if (onCardMove) {
        // Calculate newOrder here so it's available in onCardMove
        const { cardId, fromColumn, toColumn, toIndex } = params;

        // Get current data to calculate fractional index
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
          queryClient.getQueryData<PaginatedJsonResult<T>>(fromQueryKey);
        const toData =
          queryClient.getQueryData<PaginatedJsonResult<T>>(toQueryKey);

        // Calculate newOrder - ensure it's always a valid fractional index
        let newOrder: string;

        if (fromData && toData) {
          const fromDataItems = [...fromData.data];
          const itemIndex = fromDataItems.findIndex(
            (item) => getItemId(item as T) === cardId
          );
          if (itemIndex !== -1) {
            fromDataItems.splice(itemIndex, 1);
            const toDataItems =
              fromColumn.id === toColumn.id ? fromDataItems : [...toData.data];

            // Sort items by order before calculating fractional index
            const sortedItems = [...toDataItems].sort((a, b) => {
              const aOrder = (a as T & { order: string }).order || "";
              const bOrder = (b as T & { order: string }).order || "";
              // Sort lexicographically (fractional indexes are designed for this)
              if (aOrder < bOrder) return -1;
              if (aOrder > bOrder) return 1;
              return 0;
            });

            newOrder = generateIndexForMove(
              sortedItems as Array<T & { order: string }>,
              toIndex
            );
          } else {
            // Item not found in source - generate fallback
            const toDataItems = [...toData.data];
            const sortedItems = [...toDataItems].sort((a, b) => {
              const aOrder = (a as T & { order: string }).order || "";
              const bOrder = (b as T & { order: string }).order || "";
              if (aOrder < bOrder) return -1;
              if (aOrder > bOrder) return 1;
              return 0;
            });

            if (sortedItems.length === 0 || toIndex <= 0) {
              // First item in column or inserting at top
              const firstOrder =
                sortedItems.length > 0
                  ? (sortedItems[0] as T & { order: string }).order
                  : null;
              newOrder = generateFractionalIndex(null, firstOrder);
            } else {
              // Insert at specified position
              newOrder = generateIndexForMove(
                sortedItems as Array<T & { order: string }>,
                toIndex
              );
            }
          }
        } else {
          // No data available - generate fallback for top position
          newOrder = generateFractionalIndex(null, null);
        }

        // Calculate prevOrder and nextOrder for backend
        // Backend only needs these 2 values, not all items! This is the power of fractional indexing.
        let prevOrder: string | null = null;
        let nextOrder: string | null = null;

        if (fromData && toData) {
          // Get items for destination column (excluding the moved item if same column)
          const fromDataItems = [...fromData.data];
          const itemIndex = fromDataItems.findIndex(
            (item) => getItemId(item as T) === cardId
          );
          if (itemIndex !== -1) {
            fromDataItems.splice(itemIndex, 1);
          }

          const toDataItems =
            fromColumn.id === toColumn.id ? fromDataItems : [...toData.data];

          const sortedItems = [...toDataItems].sort((a, b) => {
            const aOrder = (a as T & { order: string }).order || "";
            const bOrder = (b as T & { order: string }).order || "";
            if (aOrder < bOrder) return -1;
            if (aOrder > bOrder) return 1;
            return 0;
          });

          const validItems = sortedItems.filter(
            (item) =>
              (item as T & { order: string }).order &&
              (item as T & { order: string }).order.trim() !== ""
          );

          if (toIndex <= 0) {
            // Inserting at the beginning
            prevOrder = null;
            nextOrder =
              validItems.length > 0
                ? (validItems[0] as T & { order: string }).order
                : null;
          } else if (toIndex >= sortedItems.length) {
            // Inserting at the end
            prevOrder =
              validItems.length > 0
                ? (validItems[validItems.length - 1] as T & { order: string })
                    .order
                : null;
            nextOrder = null;
          } else {
            // Inserting between items
            let validCount = 0;
            for (let i = 0; i < toIndex && i < sortedItems.length; i++) {
              const itemOrder = (sortedItems[i] as T & { order: string }).order;
              if (itemOrder && itemOrder.trim() !== "") {
                validCount++;
              }
            }

            if (validCount > 0 && validCount <= validItems.length) {
              prevOrder =
                (validItems[validCount - 1] as T & { order: string })?.order ||
                null;
            }
            if (validCount < validItems.length) {
              nextOrder =
                (validItems[validCount] as T & { order: string })?.order ||
                null;
            }
          }
        }

        await onCardMove({
          ...params,
          newOrder,
          prevOrder,
          nextOrder,
        } as CardMoveParams<T>);
      }
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: baseKey });

      // Snapshot current state for rollback
      // Note: Optimistic update is done in handleDragEnd BEFORE this is called
      const previousData: Record<string, PaginatedJsonResult<T> | undefined> =
        {};

      for (const colDef of columnDefs) {
        const queryKey = [
          ...baseKey,
          "column",
          colDef.id,
          criteriaState.criteria.toJSON(),
        ];
        previousData[colDef.id] =
          queryClient.getQueryData<PaginatedJsonResult<T>>(queryKey);
      }

      return { previousData };
    },
    onError: (error, params, context) => {
      // Rollback to previous state
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

      // Call error handler
      onMoveError?.(error, params as CardMoveParams<T>);
    },
    onSettled: () => {
      // Delay refetch to allow drop animation to complete
      // This prevents the visual glitch where the card briefly returns to original position
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: baseKey });
      }, 250); // Wait for drop animation (200ms) + small buffer
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

  // Drag and drop handlers
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

  const handleDragOver = useCallback(() => {
    if (!enableDragDrop) return;
    // Visual feedback is handled by the components
  }, [enableDragDrop]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!enableDragDrop) return;

      const { active, over } = event;

      if (!over) {
        flushSync(() => {
          setActiveId(null);
          setActiveItem(null);
        });
        return;
      }

      const activeItemId = String(active.id);
      const overId = String(over.id);

      // Determine source and destination columns
      const fromColumn = findItemColumn(activeItemId);
      let toColumn: KanbanColumnDefinition<T> | undefined;
      let toIndex = 0;

      // Check if dropped over a column
      const overColumn = columnDefs.find((c) => c.id === overId);
      if (overColumn) {
        toColumn = overColumn;
        // When moving between columns, always go to top (index 0)
        // When reordering within same column, go to end
        if (fromColumn?.id === overColumn.id) {
          const targetItems = getColumnItems(overColumn.id);
          const itemsWithoutActive = targetItems.filter(
            (item) => getItemId(item) !== activeItemId
          );
          toIndex = itemsWithoutActive.length; // Add to end
        } else {
          toIndex = 0; // Always go to top when moving between columns
        }
      } else {
        // Dropped over another card
        toColumn = findItemColumn(overId);
        if (toColumn) {
          const targetItems = getColumnItems(toColumn.id);
          // Exclude active item if moving within same column
          const itemsWithoutActive =
            fromColumn?.id === toColumn.id
              ? targetItems.filter((item) => getItemId(item) !== activeItemId)
              : targetItems;

          const overIndex = itemsWithoutActive.findIndex(
            (item) => getItemId(item) === overId
          );

          if (overIndex === -1) {
            // Card not found, use appropriate default
            toIndex =
              fromColumn?.id === toColumn.id ? itemsWithoutActive.length : 0; // Top when moving between columns
          } else {
            // Calculate the correct insertion index
            if (fromColumn?.id === toColumn.id) {
              // Reordering within same column - use arrayMove logic
              const activeIndexInFull = targetItems.findIndex(
                (item) => getItemId(item) === activeItemId
              );
              const overIndexInFull = targetItems.findIndex(
                (item) => getItemId(item) === overId
              );
              if (activeIndexInFull !== -1 && overIndexInFull !== -1) {
                // Use arrayMove to calculate the correct position
                const itemIds = targetItems.map((item) => getItemId(item));
                const reorderedIds = arrayMove(
                  itemIds,
                  activeIndexInFull,
                  overIndexInFull
                );
                const newActiveIndex = reorderedIds.findIndex(
                  (id) => id === activeItemId
                );
                // Convert to index in list without active item
                toIndex = newActiveIndex;
              } else {
                toIndex = overIndex;
              }
            } else {
              // Moving from different column - always go to top
              toIndex = 0;
            }
          }
        }
      }

      if (!fromColumn || !toColumn) {
        flushSync(() => {
          setActiveId(null);
          setActiveItem(null);
        });
        return;
      }

      // Don't do anything if dropped in same position
      if (fromColumn.id === toColumn.id && activeItemId === overId) {
        flushSync(() => {
          setActiveId(null);
          setActiveItem(null);
        });
        return;
      }

      const item = findItem(activeItemId);
      if (!item) {
        flushSync(() => {
          setActiveId(null);
          setActiveItem(null);
        });
        return;
      }

      // === OPTIMISTIC UPDATE DIRECTLY IN handleDragEnd ===
      // This ensures the UI is updated BEFORE the overlay disappears
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
        queryClient.getQueryData<PaginatedJsonResult<T>>(fromQueryKey);
      const toData =
        queryClient.getQueryData<PaginatedJsonResult<T>>(toQueryKey);

      if (fromData && toData) {
        const fromDataItems = [...fromData.data];
        const itemIndex = fromDataItems.findIndex(
          (dataItem) => getItemId(dataItem as T) === activeItemId
        );

        if (itemIndex !== -1) {
          const movedItem = fromDataItems[itemIndex];
          fromDataItems.splice(itemIndex, 1);

          const toDataItems =
            fromColumn.id === toColumn.id ? fromDataItems : [...toData.data];

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
            const currentItems = [...fromData.data];
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

              queryClient.setQueryData<PaginatedJsonResult<T>>(toQueryKey, {
                ...toData,
                data: reorderedItems as T[] as typeof toData.data,
              });
            }
          } else {
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

            queryClient.setQueryData<PaginatedJsonResult<T>>(fromQueryKey, {
              ...fromData,
              data: sortedFromItems as typeof fromData.data,
              meta: {
                ...fromData.meta,
                total: fromData.meta.total - 1,
              },
            });

            queryClient.setQueryData<PaginatedJsonResult<T>>(toQueryKey, {
              ...toData,
              data: sortedToItems as typeof toData.data,
              meta: {
                ...toData.meta,
                total: toData.meta.total + 1,
              },
            });
          }
        }
      }

      // Clear active state AFTER cache is updated - use flushSync to ensure
      // React renders the new positions before the overlay disappears
      flushSync(() => {
        setActiveId(null);
        setActiveItem(null);
      });

      // Now trigger the mutation for server-side persistence (without optimistic update)
      moveMutation.mutate({
        cardId: activeItemId,
        item,
        fromColumn,
        toColumn,
        toIndex,
      });
    },
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
  }, []);

  // DndContext props
  const dndContextProps: KanbanDndContextProps = {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragCancel,
  };

  // Filter integration props
  const filterProps: FilterIntegrationProps = {
    fields: filterFields,
    filters: criteriaState.filters,
    addOrReplaceByIndex: criteriaState.addOrReplaceByIndex,
    removeFilter: criteriaState.removeFilter,
    clearFilters: criteriaState.clearFilters,
  };

  // Search integration props
  const searchProps: SearchIntegrationProps = {
    searchValue,
    onSearchChange: handleSearchChange,
    showSearch: true,
  };

  // Loading states
  const isLoading = columns.some((col) => col.isLoading);
  const isFetching = columns.some((col) => col.isFetching);

  // Refetch all columns
  const refetchAll = useCallback(async () => {
    await Promise.all(columns.map((col) => col.refetch()));
  }, [columns]);

  return {
    columns,
    criteriaState,
    filterProps,
    searchProps,
    dndContextProps,
    sensors,
    activeItem,
    activeId,
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
