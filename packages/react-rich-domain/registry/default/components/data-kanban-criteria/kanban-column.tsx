"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { KanbanColumnContent } from "./kanban-column-content";
import type { KanbanColumnProps } from "@/types/use-criteria-kanban.type";

/**
 * Kanban column component with droppable area and sortable context
 *
 * Renders a single column of the Kanban board with:
 * - Droppable area for cards from other columns
 * - SortableContext for card reordering within the column
 * - Virtualized content for performance with large lists
 * - Customizable header, footer, and empty states
 *
 * @example
 * ```tsx
 * <KanbanColumn
 *   columnData={columnData}
 *   getItemId={(item) => item.id}
 *   renderCard={(item, isDragging) => (
 *     <TaskCard task={item} isDragging={isDragging} />
 *   )}
 *   estimatedCardHeight={120}
 * />
 * ```
 */
function KanbanColumn<T>({
  columnData,
  getItemId,
  renderCard,
  renderHeader,
  renderFooter,
  renderEmpty,
  className,
  estimatedCardHeight,
  minHeight = "400px",
  showItemCount = true,
  activeId,
  onCardClick,
}: KanbanColumnProps<T>) {
  const {
    column,
    items,
    totalCount,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = columnData;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = React.useState(400);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const itemIds = React.useMemo(
    () => items.map((item) => getItemId(item)),
    [items, getItemId]
  );

  // Parse minHeight to get numeric value for calculations
  const minHeightValue = React.useMemo(() => {
    if (typeof minHeight === "string") {
      const match = minHeight.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 400;
    }
    return minHeight || 400;
  }, [minHeight]);

  React.useEffect(() => {
    if (!containerRef.current) return;

    // Calculate available height: minHeight - header - footer
    // We need to wait for the header to render to get its actual height
    const calculateHeight = () => {
      const columnElement = containerRef.current?.parentElement;
      if (!columnElement) return;

      const headerElement = columnElement.querySelector(
        '[data-slot="kanban-column-header"]'
      ) as HTMLElement;
      const footerElement = columnElement.querySelector(
        '[data-slot="kanban-column-footer"]'
      ) as HTMLElement;

      const headerHeight = headerElement?.clientHeight || 40;
      const footerHeight = footerElement?.clientHeight || 0;
      const availableHeight = minHeightValue - headerHeight - footerHeight;

      setContainerHeight(Math.max(availableHeight, 200)); // Minimum 200px
    };

    // Calculate immediately and after a short delay to ensure DOM is ready
    calculateHeight();
    const timeout = setTimeout(calculateHeight, 0);

    return () => clearTimeout(timeout);
  }, [minHeightValue]);

  const defaultHeader = (
    <KanbanColumnHeader>
      <KanbanColumnTitle
        style={column.color ? { borderLeftColor: column.color } : undefined}
        className={column.color ? "border-l-4 pl-2" : undefined}
      >
        {column.icon && <span className="mr-2">{column.icon}</span>}
        {column.title}
      </KanbanColumnTitle>
      {showItemCount && (
        <KanbanColumnCounter>
          {totalCount}
          {column.limit && ` / ${column.limit}`}
        </KanbanColumnCounter>
      )}
    </KanbanColumnHeader>
  );

  const defaultEmpty = (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <p className="text-sm">No items</p>
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      data-slot="kanban-column"
      data-column-id={column.id}
      data-over={isOver || undefined}
      className={cn(
        "flex flex-col rounded-lg border bg-muted/30",
        "transition-colors duration-200",
        isOver && "bg-primary/5 border-primary/30",
        className
      )}
    >
      {renderHeader ? renderHeader(column, totalCount) : defaultHeader}

      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {isLoading ? (
            <KanbanColumnSkeleton count={3} />
          ) : items.length === 0 ? (
            renderEmpty ? renderEmpty(column) : defaultEmpty
          ) : (
            <KanbanColumnContent
              items={items}
              getItemId={getItemId}
              renderCard={renderCard}
              estimatedCardHeight={estimatedCardHeight}
              containerHeight={containerHeight}
              activeId={activeId}
              onCardClick={onCardClick}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={fetchNextPage}
            />
          )}
        </SortableContext>
      </div>

      {renderFooter && (
        <KanbanColumnFooter>
          {renderFooter(column)}
        </KanbanColumnFooter>
      )}
    </div>
  );
}

/**
 * Header section for KanbanColumn
 */
function KanbanColumnHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kanban-column-header"
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 border-b bg-background/50",
        className
      )}
      {...props}
    />
  );
}

/**
 * Title element for KanbanColumn header
 */
function KanbanColumnTitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="kanban-column-title"
      className={cn(
        "font-semibold text-sm flex items-center",
        className
      )}
      {...props}
    />
  );
}

/**
 * Counter badge showing item count
 */
function KanbanColumnCounter({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kanban-column-counter"
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "bg-secondary text-secondary-foreground",
        "px-2 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    />
  );
}

/**
 * Footer section for KanbanColumn
 */
function KanbanColumnFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kanban-column-footer"
      className={cn(
        "px-3 py-2 border-t bg-background/50",
        className
      )}
      {...props}
    />
  );
}

/**
 * Loading skeleton for column content
 */
function KanbanColumnSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-lg border p-3 animate-pulse"
        >
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export {
  KanbanColumn,
  KanbanColumnHeader,
  KanbanColumnTitle,
  KanbanColumnCounter,
  KanbanColumnFooter,
  KanbanColumnSkeleton,
};
