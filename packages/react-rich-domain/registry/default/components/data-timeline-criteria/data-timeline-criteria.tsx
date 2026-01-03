"use client";

import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";
import {
  DataViewToolbar,
  type FileFormat,
} from "../data-view-criteria/data-view-toolbar";
import { DataViewEmpty } from "../data-view-criteria/data-view-empty";
import { DataTimelineGroup } from "./data-timeline-group";
import { DataTimelineItem } from "./data-timeline-item";
import { DataTimelineSkeleton } from "./data-timeline-skeleton";
import type { UseCriteriaTimelineReturn } from "@/types/use-criteria-timeline.type";
import { cn } from "@/lib/utils";

interface DataTimelineCriteriaProps<T> {
  /**
   * Timeline state from useCriteriaTimeline
   */
  timeline: UseCriteriaTimelineReturn<T>;

  /**
   * Render function for each timeline event
   * Receives the item, index within group, and whether it's the last item
   */
  renderEvent: (item: T, index: number, isLast: boolean) => React.ReactNode;

  /**
   * Custom icon for timeline markers
   * Can be a function that receives the item and returns a ReactNode
   */
  getIcon?: (item: T) => React.ReactNode;

  /**
   * Placeholder text for search input
   * @default "Search events..."
   */
  searchPlaceholder?: string;

  /**
   * Empty state message
   * @default "No events found."
   */
  emptyMessage?: string;

  /**
   * Custom action bar (e.g., buttons, filters)
   */
  actionBar?: React.ReactNode;

  /**
   * Export function for different formats
   */
  onExport?: (format: FileFormat) => Promise<string> | string;

  /**
   * Whether to show relative time labels (e.g., "Today", "Yesterday")
   * @default true
   */
  showRelativeLabels?: boolean;
  toolbarLayout?: "default" | "none";

  /**
   * Custom className for the container
   */
  className?: string;
}

export function DataTimelineCriteria<T>({
  timeline,
  renderEvent,
  getIcon,
  searchPlaceholder = "Search events...",
  emptyMessage = "No events found.",
  actionBar,
  onExport,
  showRelativeLabels = true,
  toolbarLayout = "default",
  className,
}: DataTimelineCriteriaProps<T>) {
  const {
    groupedData,
    isLoading,
    filterProps,
    searchProps,
    loadMore,
    hasMore,
    isLoadingMore,
  } = timeline;

  // Ref to prevent multiple simultaneous fetches
  const isFetchingRef = useRef(false);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
    triggerOnce: false,
  });

  useEffect(() => {
    console.log("[Timeline] useEffect triggered:", {
      inView,
      hasMore,
      isLoadingMore,
      isFetching: isFetchingRef.current,
    });

    if (inView && hasMore && !isLoadingMore && !isFetchingRef.current) {
      console.log("[Timeline] Calling loadMore()");
      isFetchingRef.current = true;
      loadMore();
    }
  }, [inView, hasMore, isLoadingMore, loadMore]);

  // Reset the fetching ref when element goes out of view
  useEffect(() => {
    if (!inView && !isLoadingMore) {
      console.log("[Timeline] Element out of view, resetting fetch lock");
      isFetchingRef.current = false;
    }
  }, [inView, isLoadingMore]);

  const isEmpty = !isLoading && groupedData.length === 0;
  const hasData = groupedData.length > 0;

  const showToolbar = toolbarLayout !== "none";

  // Timeline content JSX
  const timelineContent = (
    <>
      {isLoading && <DataTimelineSkeleton count={3} />}

      {isEmpty && <DataViewEmpty message={emptyMessage} />}

      {hasData && (
        <div className="space-y-8">
          {groupedData.map((group) => (
            <DataTimelineGroup
              key={group.date}
              group={group}
              showRelativeLabel={showRelativeLabels}
              renderItem={(item, itemIndex, isLast) => (
                <DataTimelineItem
                  key={itemIndex}
                  isLast={isLast}
                  icon={getIcon?.(item)}
                >
                  {renderEvent(item, itemIndex, isLast)}
                </DataTimelineItem>
              )}
            />
          ))}

          {hasMore && (
            <div ref={inViewRef} className="flex justify-center py-8">
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading more events...</span>
                </div>
              )}
            </div>
          )}

          {!hasMore && !isLoading && (
            <div className="flex justify-center py-8 text-sm text-muted-foreground">
              <span>✨ You&apos;ve reached the end</span>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Vertical layout (default)
  if (toolbarLayout === "default" || toolbarLayout === "none") {
    return (
      <div className={cn("space-y-6", className)}>
        {showToolbar && (
          <DataViewToolbar
            searchProps={searchProps}
            searchPlaceholder={searchPlaceholder}
            filterProps={filterProps}
            actionBar={actionBar}
            onExport={onExport}
          />
        )}
        {timelineContent}
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen gap-6", className)}>
      <div
        className={cn(
          "w-80 shrink-0 overflow-y-auto border-r p-6 scroll-smooth",
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
        )}
      >
        <DataViewToolbar
          searchProps={searchProps}
          searchPlaceholder={searchPlaceholder}
          filterProps={filterProps}
          actionBar={actionBar}
          onExport={onExport}
        />
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto p-6 scroll-smooth",
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
        )}
      >
        {timelineContent}
      </div>
    </div>
  );
}
