import { useCallback, useEffect, useMemo } from "react";
import { useCriteriaInfiniteQuery } from "./use-criteria-infinite-query";
import type {
  Criteria,
  FieldPath,
  PaginatedJsonResult,
} from "@woltz/rich-domain";
import type {
  UseCriteriaTimelineOptions,
  UseCriteriaTimelineReturn,
  TimelineGroup,
  TimelineGroupBy,
} from "../types/use-criteria-timeline.type";
import { useDebounceCallback } from "./use-debounce-callback";
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  startOfHour,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  isThisYear,
} from "date-fns";

function getStartOfPeriod(date: Date, groupBy: TimelineGroupBy): Date {
  switch (groupBy) {
    case "hour":
      return startOfHour(date);
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date);
    case "month":
      return startOfMonth(date);
    case "year":
      return startOfYear(date);
  }
}

function formatGroupLabel(date: Date, groupBy: TimelineGroupBy): string {
  switch (groupBy) {
    case "hour":
      return format(date, "MMMM d, yyyy 'at' h:mm a");
    case "day":
      return format(date, "MMMM d, yyyy");
    case "week":
      return format(date, "'Week of' MMMM d, yyyy");
    case "month":
      return format(date, "MMMM yyyy");
    case "year":
      return format(date, "yyyy");
  }
}

function getRelativeLabel(date: Date, groupBy: TimelineGroupBy): string {
  if (groupBy === "hour") {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  if (groupBy === "day") {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isThisWeek(date)) return format(date, "EEEE"); // Day name
  }

  if (groupBy === "week") {
    if (isThisWeek(date)) return "This Week";
  }

  if (groupBy === "month") {
    if (isThisMonth(date)) return "This Month";
  }

  if (groupBy === "year") {
    if (isThisYear(date)) return "This Year";
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

function groupDataByTime<T>(
  data: T[],
  dateField: FieldPath<T>,
  groupBy: TimelineGroupBy
): TimelineGroup<T>[] {
  const groups = new Map<string, TimelineGroup<T>>();

  for (const item of data) {
    const dateValue = (item as never)[dateField];
    if (!dateValue) continue;

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date value for item: ${dateValue}`);
      continue;
    }

    const periodStart = getStartOfPeriod(date, groupBy);
    const key = periodStart.toISOString();

    let group = groups.get(key);
    if (!group) {
      group = {
        date: key,
        label: formatGroupLabel(periodStart, groupBy),
        relativeLabel: getRelativeLabel(periodStart, groupBy),
        items: [],
      };
      groups.set(key, group);
    }

    group.items.push(item);
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Hook for timeline view with date-based grouping
 *
 * Extends useCriteriaQuery with automatic date sorting and grouping.
 * Groups items by time periods (hour/day/week/month/year) and provides
 * relative time labels.
 *
 * @example
 * ```tsx
 * const timeline = useCriteriaTimeline({
 *   queryKey: ['activities'],
 *   queryFn: getActivities,
 *   dateField: 'createdAt',
 *   groupBy: 'day',
 *   filterFields,
 * });
 *
 * return (
 *   <DataTimelineCriteria
 *     timeline={timeline}
 *     renderEvent={(activity) => <ActivityCard {...activity} />}
 *   />
 * );
 * ```
 */
export function useCriteriaTimeline<T>(
  queryKey: string | readonly unknown[],
  queryFn: (criteria: Criteria<T>) => Promise<PaginatedJsonResult<T>>,
  options: UseCriteriaTimelineOptions<T>
): UseCriteriaTimelineReturn<T> {
  const {
    dateField,
    groupBy = "day",
    sortDirection = "desc",
    filterFields = [],
    searchDebounceMs = 500,
    ...queryOptions
  } = options;

  const queryResult = useCriteriaInfiniteQuery<T>(queryKey, queryFn, {
    ...queryOptions,
    initialSort: [{ field: dateField, direction: sortDirection }],
  });
  const { criteria } = queryResult;

  useEffect(() => {
    if (
      criteria.sorting.length === 0 ||
      criteria.sorting[0]?.field !== dateField
    ) {
      criteria.addSort(dateField, sortDirection);
    }
    // Do not have sorting button so we don't need to re-add the sort when the sorting changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateField, sortDirection]);

  const groupedData = useMemo(() => {
    return groupDataByTime(queryResult.data, dateField, groupBy);
  }, [queryResult.data, dateField, groupBy]);

  const [debouncedSetSearch] = useDebounceCallback((value: string) => {
    criteria.setSearch(value);
  }, searchDebounceMs);

  const handleSearchChange = useCallback(
    (value: string) => {
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  const searchProps = useMemo(
    () => ({
      searchValue: criteria.search || "",
      onSearchChange: handleSearchChange,
      showSearch: true,
    }),
    [criteria.search, handleSearchChange]
  );

  const loadMore = useCallback(() => {
    if (queryResult.hasNextPage && !queryResult.isFetchingNextPage) {
      queryResult.fetchNextPage();
    }
  }, [queryResult]);

  const hasMore = queryResult.hasNextPage;
  const isLoadingMore = queryResult.isFetchingNextPage;

  return {
    ...queryResult,
    groupedData,
    dateField,
    groupBy,
    filterProps: {
      queryFilter: filterFields,
      criteria,
    },
    searchProps,
    loadMore,
    hasMore,
    isLoadingMore,
    isRefetching: queryResult.isFetching,
  };
}
