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
 *   containerHeight={500}
 *   activeId={activeId}
 * />
 * ```
 */
function KanbanColumnContent<T>({
  items,
  getItemId,
  renderCard,
  estimatedCardHeight,
  containerHeight,
  activeId,
  onCardClick,
}: KanbanColumnContentProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  // Track if a drag just ended to prevent click
  const didDragRef = React.useRef(false);

  // Set didDragRef when activeId changes from something to null (drag ended)
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

  // Find the index of the actively dragged item
  const activeIndex = React.useMemo(() => {
    if (!activeId) return -1;
    return items.findIndex((item) => getItemId(item) === String(activeId));
  }, [items, activeId, getItemId]);

  // Configure virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedCardHeight + 8, // Add gap
    overscan: 5, // Render 5 extra items above/below viewport
    // Keep the active item always rendered during drag
    rangeExtractor: (range) => {
      const { startIndex, endIndex } = range;
      const indices = new Set<number>();

      // Add visible indices
      for (let i = startIndex; i <= endIndex; i++) {
        indices.add(i);
      }

      // Always include the active item if it exists
      if (activeIndex >= 0) {
        indices.add(activeIndex);
      }

      return Array.from(indices).sort((a, b) => a - b);
    },
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Handle card click - only fire if not dragging
  const handleCardClick = React.useCallback(
    (item: T, isDragging: boolean) => {
      if (isDragging || didDragRef.current || !onCardClick) return;
      onCardClick(item);
    },
    [onCardClick]
  );

  // Don't use virtualization for small lists (< 20 items)
  // This avoids complexity for the common case
  if (items.length < 20) {
    return (
      <div className="p-2 space-y-2">
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
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="p-2 overflow-auto"
      style={{ height: containerHeight, maxHeight: containerHeight }}
    >
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
              data-item-id={itemId}
              data-index={virtualItem.index}
              className={cn(
                "absolute top-0 left-0 w-full",
                "pb-2" // Gap between cards
              )}
              style={{
                height: virtualItem.size,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              onClick={() => handleCardClick(item, isDragging)}
            >
              {renderCard(item, isDragging)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { KanbanColumnContent };
