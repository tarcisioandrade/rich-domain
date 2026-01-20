"use client";

import { useCriteriaKanban } from "./hooks/use-criteria-kanban";
import { DataKanbanCriteria, KanbanCardAction } from "./components/data-kanban-criteria";
import {
  KanbanCard,
  KanbanCardHeader,
  KanbanCardTitle,
  KanbanCardDescription,
  KanbanCardContent,
  KanbanCardFooter,
  KanbanCardBadge,
} from "./components/data-kanban-criteria";
import { getTasks, moveTask, type Task } from "./service/get-tasks";
import type { KanbanColumnDefinition } from "./types/use-criteria-kanban.type";
import type { QueryFilter } from "./lib/filter-utils";
import { Circle, Clock, CheckCircle2, User, AlertTriangle, X, Archive, Plus, PlusCircle, Edit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./components/ui/button";

/**
 * Filter field definitions for the Kanban toolbar
 */
const filterFields: QueryFilter[] = [
  {
    type: "string",
    field: "priority",
    fieldLabel: "Priority",
    multiSelect: true,
    options: [
      { label: "High", value: "high" },
      { label: "Medium", value: "medium" },
      { label: "Low", value: "low" },
    ],
  },
  {
    type: "string",
    field: "assignee",
    fieldLabel: "Assignee",
  },
  {
    type: "date",
    field: "createdAt",
    fieldLabel: "Created At",
  },
];

/**
 * Column definitions for the Kanban board
 * Each column filters tasks by status using Criteria
 */
const columns: KanbanColumnDefinition<Task>[] = [
  {
    id: "todo",
    title: "To Do",
    criteria: (c) => c.where("status", "equals", "todo"),
    value: "todo",
    color: "#6b7280", // gray
    icon: <Circle className="h-4 w-4 text-gray-500" />,
  },
  {
    id: "doing",
    title: "In Progress",
    criteria: (c) => c.where("status", "equals", "doing"),
    value: "doing",
    color: "#3b82f6", // blue
    icon: <Clock className="h-4 w-4 text-blue-500" />,
  },
  {
    id: "done",
    title: "Done",
    criteria: (c) => c.where("status", "equals", "done"),
    value: "done",
    color: "#22c55e", // green
    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  },
  {
    id: "archived",
    title: "Archived",
    criteria: (c) => c.where("status", "equals", "archived"),
    value: "archived",
    color: "#6b7280", // gray
    icon: <Archive className="h-4 w-4 text-gray-500" />,
  },
  {
    id: "cancelled",
    title: "Cancelled",
    criteria: (c) => c.where("status", "equals", "cancelled"),
    value: "cancelled",
    color: "#f44336", // red
    icon: <X className="h-4 w-4 text-red-500" />,
  },
];

/**
 * Priority badge colors
 */
const priorityColors: Record<Task["priority"], string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

/**
 * Label colors for visual variety
 */
const labelColors: Record<string, string> = {
  architecture:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  design: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  auth: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  security: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  frontend: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  backend:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  devops: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  testing:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  documentation:
    "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  default:
    "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

/**
 * Renders a task card for the Kanban board
 */
function TaskCard({ task, isDragging, isClickable }: { task: Task; isDragging: boolean; isClickable: boolean }) {
  return (
    <KanbanCard id={task.id} isDragging={isDragging} isClickable={isClickable}>
      <KanbanCardHeader>
        <KanbanCardTitle>{task.title}</KanbanCardTitle>
      </KanbanCardHeader>

      <KanbanCardContent>
        <KanbanCardDescription>{task.description}</KanbanCardDescription>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.labels.map((label) => (
              <span
                key={label}
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${labelColors[label] || labelColors.default
                  }`}
              >
                {label}
              </span>
            ))}
          </div>
        )}
        <KanbanCardAction>
          <Button data-no-drag variant="ghost" size="icon" onClick={() => {
            console.log(task.id);
          }}>
            <Edit className="h-4 w-4" />
          </Button>
        </KanbanCardAction>
      </KanbanCardContent>

      <KanbanCardFooter>
        <KanbanCardBadge className={priorityColors[task.priority]}>
          {task.priority === "high" && (
            <AlertTriangle className="h-3 w-3 mr-1" />
          )}
          {task.priority}
        </KanbanCardBadge>

        <div className="flex items-center gap-1 text-muted-foreground ml-auto">
          <User className="h-3 w-3" />
          <span className="truncate max-w-[100px]">{task.assignee}</span>
        </div>
      </KanbanCardFooter>
    </KanbanCard>
  );
}

/**
 * Task Kanban Board Example
 *
 * Demonstrates the Kanban component with:
 * - Drag and drop between columns
 * - Optimistic updates
 * - Filter and search integration
 * - Custom card rendering
 */
export function TaskKanban() {
  const kanban = useCriteriaKanban<Task>(["tasks", "kanban"], getTasks, {
    columns,
    getItemId: (task) => task.id,
    groupField: "status",
    filterFields,
    columnPageSize: 20,
    syncWithUrl: true,
    onCardMove: async ({ cardId, toColumn, insertAfterId }) => {
      await moveTask(cardId, toColumn.id as Task["status"], insertAfterId);
    },

    onMoveError: (error, { fromColumn }) => {
      toast.error(`Failed to move task. Reverted to ${fromColumn.title}`, {
        description: error.message,
      });
    },
  });

  return (
    <div className="w-full">
      <DataKanbanCriteria
        kanban={kanban}
        renderCard={(task, isDragging, isClickable) => (
          <TaskCard task={task} isDragging={isDragging} isClickable={isClickable} />
        )}
        renderColumnHeader={(column, total) => (
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center text-sm">
              {column.color && (
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: column.color }}
                />
              )}
              <h3 className="font-semibold">{column.title}</h3>
              <div className="ml-2 border p-1 rounded text-xs">{total}</div>
            </div>
            <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => {
              console.log(column.id);
            }}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
        renderEmptyState={(column) => (
          <div className="space-y-4 mt-4">
            <p className="text-muted-foreground text-sm">No task added here.</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => {
              console.log(column.id);
            }}>
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        )}
        onCardClick={(task) => {
          console.log(task.order);
        }}
        estimatedCardHeight={160}
        columnsContentScrollClassName="h-[calc(100vh-230px)]"
      />
    </div>
  );
}
