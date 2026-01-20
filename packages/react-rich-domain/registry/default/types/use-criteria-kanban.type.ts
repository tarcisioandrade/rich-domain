import type { Criteria, FieldPath, PaginatedJsonResult } from "@woltz/rich-domain";
import type { UseMutationResult } from "@tanstack/react-query";
import type { UseCriteriaOptions, UseCriteriaReturn } from "./use-criteria.type";
import type {
  FilterIntegrationProps,
  SearchIntegrationProps,
} from "@/components/data-view-criteria/data-view-filter/data-view-filter";
import type { QueryFilter } from "../lib/filter-utils";
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import type { SensorDescriptor, SensorOptions } from "@dnd-kit/core";

/**
 * Definition for a Kanban column - fully configurable via props
 */
export interface KanbanColumnDefinition<T> {
  /**
   * Unique identifier for the column
   */
  id: string;

  /**
   * Display title for the column header
   */
  title: string;

  /**
   * Function that returns criteria filter for this column's items
   * Receives the base criteria and should return criteria with column-specific filter
   */
  criteria: (base: Criteria<T>) => Criteria<T>;

  /**
   * Value to set on items when moved to this column
   * If omitted, uses the column `id`
   */
  value?: unknown;

  /**
   * Optional color theme for the column (CSS color or tailwind class)
   */
  color?: string;

  /**
   * Optional icon for the column header
   */
  icon?: React.ReactNode;

  /**
   * Maximum number of items allowed in this column (WIP limit)
   */
  limit?: number;
}

/**
 * Parameters passed to the onCardMove callback
 */
export interface CardMoveParams<T> {
  /**
   * Unique identifier of the card being moved
   */
  cardId: string;

  /**
   * The complete item data
   */
  item: T;

  /**
   * Column the card is being moved from
   */
  fromColumn: KanbanColumnDefinition<T>;

  /**
   * Column the card is being moved to
   */
  toColumn: KanbanColumnDefinition<T>;

  /**
   * New index position in the destination column (for frontend optimistic updates)
   */
  toIndex: number;

  /**
   * ID of the item that should be ABOVE the moved item in the destination column.
   * null means insert at the top of the column.
   *
   * Backend uses this to query the REAL neighbors and calculate the correct order,
   * which works correctly even when filters hide some items.
   */
  insertAfterId: string | null;
}

/**
 * Data for a single Kanban column including loaded items and state
 */
export interface KanbanColumnData<T> {
  /**
   * Column definition
   */
  column: KanbanColumnDefinition<T>;

  /**
   * Items currently in this column (all loaded pages combined)
   */
  items: T[];

  /**
   * Total count of items (may exceed loaded items)
   */
  totalCount: number;

  /**
   * Whether column data is loading (initial load)
   */
  isLoading: boolean;

  /**
   * Whether column is fetching (refetch)
   */
  isFetching: boolean;

  /**
   * Whether column is fetching more items (infinite scroll)
   */
  isFetchingNextPage: boolean;

  /**
   * Whether there are more items to load
   */
  hasNextPage: boolean;

  /**
   * Fetch the next page of items for this column
   */
  fetchNextPage: () => void;

  /**
   * Error if column failed to load
   */
  error: Error | null;

  /**
   * Refetch this column's data
   */
  refetch: () => Promise<void>;
}

/**
 * Configuration options for useCriteriaKanban hook
 */
export interface UseCriteriaKanbanOptions<T> extends UseCriteriaOptions<T> {
  /**
   * Column definitions for the Kanban board
   */
  columns: KanbanColumnDefinition<T>[];

  /**
   * Function to extract unique ID from an item
   */
  getItemId: (item: T) => string;

  /**
   * Field path that determines which column an item belongs to
   * Used for optimistic updates: item[groupField] = column.value ?? column.id
   */
  groupField: FieldPath<T>;

  /**
   * Filter field definitions for the Filter component
   */
  filterFields?: QueryFilter[];

  /**
   * Debounce delay for search input in milliseconds
   * @default 300
   */
  searchDebounceMs?: number;

  /**
   * Custom sensors for drag and drop
   * If not provided, uses default PointerSensor + TouchSensor + KeyboardSensor
   */
  sensors?: SensorDescriptor<SensorOptions>[];

  /**
   * Callback fired when a card is moved between columns
   * Should return a promise that resolves when the move is persisted
   */
  onCardMove?: (params: CardMoveParams<T>) => Promise<void>;

  /**
   * Callback fired when optimistic update fails
   */
  onMoveError?: (error: Error, params: CardMoveParams<T>) => void;

  /**
   * Whether to enable drag and drop
   * @default true
   */
  enableDragDrop?: boolean;

  /**
   * Number of items to fetch per column
   * @default 50
   */
  columnPageSize?: number;

  /**
   * Custom accessibility announcements
   */
  announcements?: {
    onDragStart?: (activeId: UniqueIdentifier) => string;
    onDragOver?: (activeId: UniqueIdentifier, overId: UniqueIdentifier) => string;
    onDragEnd?: (activeId: UniqueIdentifier, overId: UniqueIdentifier) => string;
    onDragCancel?: (activeId: UniqueIdentifier) => string;
  };
}

/**
 * Query function type for fetching Kanban data
 */
export type KanbanQueryFn<T> = (
  criteria: Criteria<T>
) => Promise<PaginatedJsonResult<T>>;

/**
 * Props for DndContext provided by the hook
 */
export interface KanbanDndContextProps {
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
}

/**
 * Return type for useCriteriaKanban hook
 */
export interface UseCriteriaKanbanReturn<T> {
  /**
   * Data for each column (items, loading state, etc.)
   */
  columns: KanbanColumnData<T>[];

  /**
   * All criteria state and methods (for global filters)
   */
  criteriaState: UseCriteriaReturn<T>;

  /**
   * Props for filter integration
   */
  filterProps: FilterIntegrationProps;

  /**
   * Props for search integration
   */
  searchProps: SearchIntegrationProps;

  /**
   * Props to spread on DndContext
   */
  dndContextProps: KanbanDndContextProps;

  /**
   * Sensors configured for drag and drop
   */
  sensors: SensorDescriptor<SensorOptions>[];

  /**
   * Currently dragged item (for DragOverlay)
   */
  activeItem: T | null;

  /**
   * ID of currently dragged item
   */
  activeId: UniqueIdentifier | null;

  /**
   * Move a card programmatically
   */
  moveCard: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    toIndex?: number
  ) => Promise<void>;

  /**
   * Mutation result for card moves
   */
  moveMutation: UseMutationResult<void, Error, CardMoveParams<T>>;

  /**
   * Whether any column is loading
   */
  isLoading: boolean;

  /**
   * Whether any column is fetching
   */
  isFetching: boolean;

  /**
   * Refetch all columns
   */
  refetchAll: () => Promise<void>;

  /**
   * Get items for a specific column by ID
   */
  getColumnItems: (columnId: string) => T[];

  /**
   * Get column data by ID
   */
  getColumn: (columnId: string) => KanbanColumnData<T> | undefined;

  /**
   * Find which column contains a specific item
   */
  findItemColumn: (itemId: string) => KanbanColumnDefinition<T> | undefined;
}

/**
 * Props for the main DataKanbanCriteria component
 */
export interface DataKanbanCriteriaProps<T> {
  /**
   * Return value from useCriteriaKanban hook
   */
  kanban: UseCriteriaKanbanReturn<T>;

  /**
   * Render function for each card
   */
  renderCard: (item: T, isDragging: boolean) => React.ReactNode;

  /**
   * Optional render function for column header
   */
  renderColumnHeader?: (column: KanbanColumnDefinition<T>, itemCount: number) => React.ReactNode;

  /**
   * Optional render function for column footer
   */
  renderColumnFooter?: (column: KanbanColumnDefinition<T>) => React.ReactNode;

  /**
   * Toolbar layout configuration
   * @default "default"
   */
  toolbarLayout?: "default" | "compact" | "none";

  /**
   * Additional actions to show in toolbar
   */
  actionBar?: React.ReactNode;

  /**
   * Custom class name for the root element
   */
  className?: string;

  /**
   * Custom class name for columns container
   */
  columnsClassName?: string;

  /**
   * Custom class name for each column
   */
  columnClassName?: string;

  /**
   * Card height for virtualization (in pixels)
   * @default 120
   */
  estimatedCardHeight?: number;

  /**
   * Whether to show column item counts
   * @default true
   */
  showItemCount?: boolean;

  /**
   * Whether to show loading skeleton
   * @default true
   */
  showSkeleton?: boolean;

  /**
   * Callback when a card is clicked
   */
  onCardClick?: (item: T) => void;

  /**
   * Custom class name for the column content scroll container
   */
  columnsContentScrollClassName?: string;

  /**
   * Optional render function for empty column state
   * If not provided, uses default "No items" message
   */
  renderEmptyState?: (column: KanbanColumnDefinition<T>) => React.ReactNode;
}

/**
 * Props for KanbanColumn component
 */
export interface KanbanColumnProps<T> {
  /**
   * Column data from the hook
   */
  columnData: KanbanColumnData<T>;

  /**
   * Function to get item ID
   */
  getItemId: (item: T) => string;

  /**
   * Render function for each card
   */
  renderCard: (item: T, isDragging: boolean) => React.ReactNode;

  /**
   * Optional render function for column header
   */
  renderHeader?: (column: KanbanColumnDefinition<T>, itemCount: number) => React.ReactNode;

  /**
   * Optional render function for column footer
   */
  renderFooter?: (column: KanbanColumnDefinition<T>) => React.ReactNode;

  /**
   * Callback when a card is clicked
   */
  onCardClick?: (item: T) => void;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Estimated card height for virtualization
   */
  estimatedCardHeight: number;

  /**
   * Whether to show item count
   */
  showItemCount?: boolean;

  /**
   * Currently active (dragging) item ID
   */
  activeId: UniqueIdentifier | null;

  /**
   * Custom class name for the column content scroll container
   */
  columnsContentScrollClassName?: string;

  /**
   * Optional render function for empty column state
   */
  renderEmptyState?: () => React.ReactNode;
}

/**
 * Props for KanbanCard component
 */
export interface KanbanCardProps {
  /**
   * Unique identifier for the card
   */
  id: string;

  /**
   * Whether the card is currently being dragged
   */
  isDragging?: boolean;

  /**
   * Whether the card is an overlay (clone being dragged)
   */
  isOverlay?: boolean;

  /**
   * Content to render inside the card
   */
  children: React.ReactNode;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Whether drag is disabled for this card
   */
  disabled?: boolean;

  /**
   * Click handler for the card
   */
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Props for virtualized column content
 */
export interface KanbanColumnContentProps<T> {
  /**
   * Items to render
   */
  items: T[];

  /**
   * Function to get item ID
   */
  getItemId: (item: T) => string;

  /**
   * Render function for each card
   */
  renderCard: (item: T, isDragging: boolean) => React.ReactNode;

  /**
   * Estimated card height for virtualization
   */
  estimatedCardHeight: number;

  /**
   * Custom class name for the column content scroll container
   */
  columnsContentScrollClassName?: string;

  /**
   * Callback when a card is clicked
   */
  onCardClick?: (item: T) => void;

  /**
   * Currently active (dragging) item ID
   */
  activeId: UniqueIdentifier | null;

  /**
   * Whether there are more items to load
   */
  hasNextPage?: boolean;

  /**
   * Whether fetching more items
   */
  isFetchingNextPage?: boolean;

  /**
   * Callback to fetch next page
   */
  onLoadMore?: () => void;

  /**
   * Optional render function for empty column state
   */
  renderEmptyState?: () => React.ReactNode;
}
