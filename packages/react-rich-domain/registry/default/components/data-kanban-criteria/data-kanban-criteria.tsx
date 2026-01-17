"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DataViewToolbar } from "../data-view-criteria/data-view-toolbar";
import { KanbanColumn } from "./kanban-column";
import { KanbanSkeleton } from "./kanban-skeleton";
import type {
  DataKanbanCriteriaProps,
  KanbanColumnDefinition,
} from "@/types/use-criteria-kanban.type";

/**
 * Custom collision detection that combines pointerWithin and rectIntersection
 * for better drop targeting, especially when dragging over columns
 */
const customCollisionDetection: CollisionDetection = (args) => {
  // First, try pointerWithin for precise pointer-based detection
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // Fall back to rectIntersection for broader detection
  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) {
    return rectCollisions;
  }

  // Finally, use closestCenter as a last resort
  return closestCenter(args);
};

/**
 * Main Kanban board component with Criteria integration
 *
 * Provides a full-featured Kanban board with:
 * - Drag and drop cards between columns
 * - Optimistic updates for smooth UX
 * - Virtualized column content for performance
 * - Filter and search integration
 * - Customizable column headers, footers, and cards
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
 *
 * <DataKanbanCriteria
 *   kanban={kanban}
 *   renderCard={(task, isDragging) => (
 *     <TaskCard task={task} isDragging={isDragging} />
 *   )}
 * />
 * ```
 */
function DataKanbanCriteria<T>({
  kanban,
  renderCard,
  renderColumnHeader,
  renderColumnFooter,
  renderEmptyColumn,
  toolbarLayout = "default",
  actionBar,
  className,
  columnsClassName,
  columnClassName,
  estimatedCardHeight = 120,
  columnWidth = "320px",
  columnMinHeight = "400px",
  showItemCount = true,
  showSkeleton = true,
  onCardClick,
}: DataKanbanCriteriaProps<T>) {
  const {
    columns,
    filterProps,
    searchProps,
    dndContextProps,
    sensors,
    activeItem,
    activeId,
    isLoading,
  } = kanban;

  // Get the getItemId function from the hook's closure
  // We need to extract it from one of the columns
  const getItemId = React.useCallback(
    (item: T): string => {
      // Find the item in any column to determine its ID
      for (const col of columns) {
        const foundIndex = col.items.indexOf(item);
        if (foundIndex !== -1) {
          // We found it, but we need the actual ID
          // Since we don't have direct access to getItemId, we'll use a workaround
          // The item should have some ID field - check common patterns
          const itemObj = item as Record<string, unknown>;
          if (typeof itemObj.id === "string") return itemObj.id;
          if (typeof itemObj.id === "number") return String(itemObj.id);
          if (typeof itemObj._id === "string") return itemObj._id;
          if (typeof itemObj._id === "number") return String(itemObj._id);
        }
      }
      // Fallback: try to get ID directly from item
      const itemObj = item as Record<string, unknown>;
      if (typeof itemObj.id === "string") return itemObj.id;
      if (typeof itemObj.id === "number") return String(itemObj.id);
      if (typeof itemObj._id === "string") return itemObj._id;
      return String(itemObj);
    },
    [columns]
  );

  const showToolbar = toolbarLayout !== "none";

  // Kanban board content
  const boardContent = (
    <>
      {/* Loading skeleton */}
      {isLoading && showSkeleton && (
        <KanbanSkeleton
          columnCount={columns.length}
          cardCount={3}
          columnWidth={columnWidth}
        />
      )}

      {/* Kanban columns - always show columns, even when empty */}
      {!isLoading && (
        <div
          data-slot="kanban-columns"
          className={cn(
            "flex gap-4 overflow-x-auto pb-4",
            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border",
            columnsClassName
          )}
        >
          {columns.map((columnData) => (
            <div
              key={columnData.column.id}
              style={{ width: columnWidth, minWidth: columnWidth }}
            >
              <KanbanColumn
                columnData={columnData}
                getItemId={getItemId}
                renderCard={renderCard}
                renderHeader={renderColumnHeader}
                renderFooter={renderColumnFooter}
                renderEmpty={renderEmptyColumn}
                className={columnClassName}
                estimatedCardHeight={estimatedCardHeight}
                minHeight={columnMinHeight}
                showItemCount={showItemCount}
                activeId={activeId}
                onCardClick={onCardClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay - shows the card being dragged */}
      {/* dropAnimation is null so overlay disappears instantly when activeItem is cleared */}
      {/* This works with the optimistic update in handleDragEnd to prevent glitches */}
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-[300px]">{renderCard(activeItem, true)}</div>
        ) : null}
      </DragOverlay>
    </>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      {...dndContextProps}
    >
      <div data-slot="kanban" className={cn("flex flex-col gap-4", className)}>
        {/* Toolbar */}
        {showToolbar && (
          <DataViewToolbar
            searchProps={searchProps}
            searchPlaceholder="Search cards..."
            filterProps={filterProps}
            actionBar={actionBar}
          />
        )}

        {/* Board */}
        {boardContent}
      </div>
    </DndContext>
  );
}

/**
 * Props interface exported for consumers who need type info
 */
export type { DataKanbanCriteriaProps, KanbanColumnDefinition };

export { DataKanbanCriteria };
