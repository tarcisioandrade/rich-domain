import type { FieldPath } from "@woltz/rich-domain";
import type {
  UseCriteriaQueryReturn,
} from "../hooks/use-criteria-query";
import type {
  UseCriteriaInfiniteQueryOptions,
} from "../hooks/use-criteria-infinite-query";
import type { FilterIntegrationProps, SearchIntegrationProps } from "./use-criteria-table.type";
import type { QueryFilter } from "../lib/filter-utils";

/**
 * Grouping options for timeline
 */
export type TimelineGroupBy = "hour" | "day" | "week" | "month" | "year";

/**
 * A group of timeline items by time period
 */
export interface TimelineGroup<T> {
  /**
   * The date key for this group (ISO string)
   */
  date: string;

  /**
   * Human-readable label for the group
   */
  label: string;

  /**
   * Items in this group
   */
  items: T[];

  /**
   * Relative time label (e.g., "2 hours ago", "Yesterday")
   */
  relativeLabel?: string;
}

/**
 * Configuration options for useCriteriaTimeline hook
 */
export interface UseCriteriaTimelineOptions<T>
  extends UseCriteriaInfiniteQueryOptions<T> {
  /**
   * Field path to the date property in T
   */
  dateField: FieldPath<T>;

  /**
   * How to group timeline items
   * @default "day"
   */
  groupBy?: TimelineGroupBy;

  /**
   * Sort direction for timeline (will override any sorting in criteria)
   * @default "desc" (newest first)
   */
  sortDirection?: "asc" | "desc";

  /**
   * Filter field definitions for the Filter component
   */
  filterFields?: QueryFilter[];

  /**
   * Debounce delay for search input in milliseconds
   * @default 300
   */
  searchDebounceMs?: number;
}

/**
 * Return type for useCriteriaTimeline hook
 */
export interface UseCriteriaTimelineReturn<T>
  extends Omit<UseCriteriaQueryReturn<T>, "data"> {
  /**
   * Raw data array (ungrouped)
   */
  data: T[];

  /**
   * Data grouped by time periods
   */
  groupedData: TimelineGroup<T>[];

  /**
   * Field used for date grouping
   */
  dateField: FieldPath<T>;

  /**
   * Current grouping mode
   */
  groupBy: TimelineGroupBy;

  /**
   * Props for filter integration
   */
  filterProps: FilterIntegrationProps;

  /**
   * Props for search integration
   */
  searchProps: SearchIntegrationProps;

  /**
   * Load more items (for infinite scroll)
   */
  loadMore: () => void;

  /**
   * Whether there are more items to load
   */
  hasMore: boolean;

  /**
   * Whether currently loading more items
   */
  isLoadingMore: boolean;
}
