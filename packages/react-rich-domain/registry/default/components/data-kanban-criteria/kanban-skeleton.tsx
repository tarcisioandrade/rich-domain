"use client";

import { cn } from "@/lib/utils";

interface KanbanSkeletonProps {
  /**
   * Number of columns to show
   * @default 3
   */
  columnCount?: number;

  /**
   * Number of cards per column
   * @default 3
   */
  cardCount?: number;

  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Loading skeleton for Kanban board
 *
 * Renders placeholder columns and cards while data is loading.
 * Matches the visual structure of the actual Kanban board.
 *
 * @example
 * ```tsx
 * <KanbanSkeleton columnCount={4} cardCount={5} />
 * ```
 */
function KanbanSkeleton({
  columnCount = 3,
  cardCount = 3,
  className,
}: KanbanSkeletonProps) {
  return (
    <div
      data-slot="kanban-skeleton"
      className={cn("flex gap-4 overflow-x-auto pb-4", className)}
    >
      {Array.from({ length: columnCount }).map((_, columnIndex) => (
        <div
          key={columnIndex}
          className="flex flex-col rounded-lg border bg-muted/30 w-80 min-w-80 shrink-0 h-full"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background/50">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-5 w-8 bg-muted rounded-full animate-pulse" />
          </div>

          <div className="flex-1 p-2 space-y-2 min-h-[300px]">
            {Array.from({ length: cardCount }).map((_, cardIndex) => (
              <KanbanCardSkeleton key={cardIndex} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface KanbanCardSkeletonProps {
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Loading skeleton for a single Kanban card
 */
function KanbanCardSkeleton({ className }: KanbanCardSkeletonProps) {
  return (
    <div
      data-slot="kanban-card-skeleton"
      className={cn(
        "bg-card rounded-lg border p-3 space-y-2 animate-pulse",
        className
      )}
    >
      <div className="h-4 bg-muted rounded w-3/4" />

      <div className="space-y-1">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <div className="h-5 w-16 bg-muted rounded-full" />
        <div className="h-5 w-12 bg-muted rounded-full" />
      </div>
    </div>
  );
}

export { KanbanSkeleton, KanbanCardSkeleton };
