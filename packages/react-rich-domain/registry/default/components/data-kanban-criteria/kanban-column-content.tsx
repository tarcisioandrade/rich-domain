"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import type { KanbanColumnContentProps } from "@/types/use-criteria-kanban.type";

/**
 * Virtualized content renderer for Kanban column
 *
 * Uses @tanstack/react-virtual to efficiently render large lists
 * by only rendering visible items plus a configurable overscan.
 *
 * The actively dragged item is always kept rendered to ensure
 * smooth drag interactions.
 *
 * @example
 * ```tsx
 * <KanbanColumnContent
 *   items={tasks}
 *   getItemId={(task) => task.id}
 *   renderCard={(task, isDragging) => <TaskCard task={task} />}
 *   estimatedCardHeight={120}
 *   activeId={activeId}
 * />
 * ```
 */
function KanbanColumnContent<T>({
  items,
  getItemId,
  renderCard,
  estimatedCardHeight,
  activeId,
  onCardClick,
  hasNextPage,
  isFetchingNextPage,
  columnsContentScrollClassName,
  onLoadMore,
}: KanbanColumnContentProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const didDragRef = React.useRef(false);
  const isFetchingRef = React.useRef(false);
  const prevActiveIdRef = React.useRef(activeId);
  React.useEffect(() => {
    if (prevActiveIdRef.current !== null && activeId === null) {
      didDragRef.current = true;
      // Reset after a short delay
      const timer = setTimeout(() => {
        didDragRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
    prevActiveIdRef.current = activeId;
  }, [activeId]);

  const activeIndex = React.useMemo(() => {
    if (!activeId) return -1;
    return items.findIndex((item) => getItemId(item) === String(activeId));
  }, [items, activeId, getItemId]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedCardHeight + 8,
    overscan: 5,
    // Enable dynamic measurement to handle variable card heights
    measureElement: (element) => {
      // Measure the actual height of the card element
      // This will be called after the element is rendered
      return element?.getBoundingClientRect().height ?? estimatedCardHeight + 8;
    },
    rangeExtractor: (range) => {
      const { startIndex, endIndex } = range;
      const indices = new Set<number>();

      for (let i = startIndex; i <= endIndex; i++) {
        indices.add(i);
      }

      if (activeIndex >= 0) {
        indices.add(activeIndex);
      }

      return Array.from(indices).sort((a, b) => a - b);
    },
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Infinite scroll: use IntersectionObserver to detect when sentinel is visible
  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !onLoadMore || !sentinelRef.current || !parentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingRef.current) {
          console.log("fetching more items");
          isFetchingRef.current = true;
          onLoadMore();
        }
      },
      {
        root: parentRef.current,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  React.useEffect(() => {
    if (!isFetchingNextPage) {
      isFetchingRef.current = false;
    }
  }, [isFetchingNextPage]);

  const handleCardClick = React.useCallback(
    (item: T, isDragging: boolean) => {
      if (isDragging || didDragRef.current || !onCardClick) return;
      onCardClick(item);
    },
    [onCardClick]
  );

  if (items.length === 0) {
    return <Content className={columnsContentScrollClassName}>
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p className="text-sm">No items</p>
      </div>
    </Content>
  }

  if (items.length < 20) {
    return (
      <Content ref={parentRef} className={cn("space-y-2", columnsContentScrollClassName)}>
        {items.map((item) => {
          const itemId = getItemId(item);
          const isDragging = activeId ? String(activeId) === itemId : false;

          return (
            <div
              key={itemId}
              data-item-id={itemId}
              onClick={() => handleCardClick(item, isDragging)}
            >
              {renderCard(item, isDragging)}
            </div>
          );
        })}
        {hasNextPage && (
          <LoadMoreTrigger
            onLoadMore={onLoadMore}
            isFetchingNextPage={isFetchingNextPage}
          />
        )}
      </Content>
    );
  }

  return (
    <Content ref={parentRef} className={columnsContentScrollClassName}>
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          const itemId = getItemId(item);
          const isDragging = activeId ? String(activeId) === itemId : false;

          return (
            <div
              key={itemId}
              ref={(element) => {
                if (element) {
                  // Measure element to get its actual height
                  // This will update the virtualizer with the real size
                  virtualizer.measureElement(element);
                }
              }}
              data-item-id={itemId}
              data-index={virtualItem.index}
              className={cn(
                "absolute top-0 left-0 w-full",
                "pb-2"
              )}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
              onClick={() => handleCardClick(item, isDragging)}
            >
              {renderCard(item, isDragging)}
            </div>
          );
        })}
      </div>
      {hasNextPage && (
        <div className="flex justify-center py-2">
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && <LoadingSpinner />}
        </div>
      )}
    </Content>
  );
}

/**
 * Component that triggers loading more items when it becomes visible
 */
function LoadMoreTrigger({
  onLoadMore,
  isFetchingNextPage,
}: {
  onLoadMore?: () => void;
  isFetchingNextPage?: boolean;
}) {
  const triggerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!onLoadMore || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, isFetchingNextPage]);

  return (
    <div ref={triggerRef} className="flex justify-center py-2">
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}

/**
 * Simple loading spinner
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span>Loading...</span>
    </div>
  );
}

function Content({ className, ...props }: React.ComponentProps<"div">) {
  return <div
    className={cn("p-2 overflow-y-auto custom-scrollbar", className)}
    {...props}
  />
}

export { KanbanColumnContent };
