"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { KanbanCardProps } from "@/types/use-criteria-kanban.type";

/**
 * Draggable card component for Kanban board
 *
 * Uses @dnd-kit/sortable for smooth drag and drop interactions.
 * Follows the composable pattern with data-slot attributes.
 *
 * @example
 * ```tsx
 * <KanbanCard id={task.id}>
 *   <KanbanCardHeader>
 *     <KanbanCardTitle>{task.title}</KanbanCardTitle>
 *   </KanbanCardHeader>
 *   <KanbanCardContent>{task.description}</KanbanCardContent>
 * </KanbanCard>
 * ```
 */
function KanbanCard({
  id,
  isDragging = false,
  isOverlay = false,
  children,
  className,
  disabled = false,
  isClickable = false,
  onClick,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isSortableDragging && !isOverlay ? 0 : 1,
  };

  const dragging = isDragging || isSortableDragging;

  const didDragRef = React.useRef(false);

  React.useEffect(() => {
    if (isSortableDragging) {
      didDragRef.current = true;
    }
  }, [isSortableDragging]);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      if (onClick && !disabled) {
        onClick(e);
      }
    },
    [onClick, disabled]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-slot="kanban-card"
      data-dragging={dragging || undefined}
      data-overlay={isOverlay || undefined}
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-2 rounded-lg border p-3 shadow-sm select-none",
        "transition-shadow duration-200",
        "hover:shadow-md",
        dragging && "shadow-lg ring-2 ring-primary/20",
        isOverlay && "rotate-3 scale-105 shadow-xl",
        disabled && "opacity-60 cursor-not-allowed",
        !disabled && dragging && "cursor-grabbing",
        !disabled && !dragging && isClickable && "cursor-pointer",
        !disabled && !dragging && !isClickable && "cursor-grab",
        className
      )}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

/**
 * Header section for KanbanCard
 */
function KanbanCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kanban-card-header"
      className={cn("flex items-start justify-between gap-2", className)}
      {...props}
    />
  );
}

/**
 * Title element for KanbanCard
 */
function KanbanCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kanban-card-title"
      className={cn(
        "font-medium text-sm leading-tight line-clamp-2",
        className
      )}
      {...props}
    />
  );
}

/**
 * Description/subtitle element for KanbanCard
 */
function KanbanCardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kanban-card-description"
      className={cn("text-muted-foreground text-xs line-clamp-2", className)}
      {...props}
    />
  );
}

/**
 * Action button area for KanbanCard (top-right aligned)
 */
function KanbanCardAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kanban-card-action"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

/**
 * Main content area for KanbanCard
 */
function KanbanCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kanban-card-content"
      className={cn("text-sm", className)}
      {...props}
    />
  );
}

/**
 * Footer section for KanbanCard
 */
function KanbanCardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kanban-card-footer"
      className={cn(
        "flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

/**
 * Badge/tag element for KanbanCard metadata
 */
function KanbanCardBadge({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kanban-card-badge"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-secondary text-secondary-foreground",
        className
      )}
      {...props}
    />
  );
}

export {
  KanbanCard,
  KanbanCardHeader,
  KanbanCardTitle,
  KanbanCardDescription,
  KanbanCardAction,
  KanbanCardContent,
  KanbanCardFooter,
  KanbanCardBadge,
};
