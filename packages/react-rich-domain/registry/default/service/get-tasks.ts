import { criteriaToQueryParams } from "@/utils/persistence";
import type { Criteria, PaginatedJsonResult } from "@woltz/rich-domain";

const API_BASE_URL = "http://localhost:3000";

/**
 * Task entity type for Kanban board example
 */
export type Task = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  assignee: string;
  labels: string[];
  order: string; // Fractional index for ordering
  createdAt: string;
  updatedAt: string;
  updatedStageAt: string;
};

/**
 * Fetches tasks from the API with criteria filtering
 *
 * @param criteria - Criteria instance with filters, sorting, and pagination
 * @returns Paginated result with tasks
 */
export async function getTasks(
  criteria: Criteria<Task>
): Promise<PaginatedJsonResult<Task>> {
  const params = criteriaToQueryParams(criteria);
  const url = `${API_BASE_URL}/tasks?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.statusText}`);
  }

  const data: PaginatedJsonResult<Task> = await response.json();
  
  return data
}

/**
 * Parameters for moving a task
 */
export interface MoveTaskParams {
  taskId: string;
  newStatus: Task["status"];
  insertAfterId: string | null;
}

/**
 * Updates a task's status and position (for moving between columns)
 *
 * Uses "Insert Reference" pattern for scalability:
 * - Frontend sends only the ID of the task that should be ABOVE the moved task
 * - Backend queries the REAL neighbors (O(2) queries) to calculate correct order
 * - Works correctly even with filters applied (no collision with hidden items)
 *
 * @param taskId - ID of the task to move
 * @param newStatus - Target status/column
 * @param insertAfterId - ID of the task that should be above, or null to insert at top
 */
export async function moveTask(
  taskId: string,
  newStatus: Task["status"],
  insertAfterId: string | null
): Promise<Task> {
  const url = `${API_BASE_URL}/tasks/${taskId}/move`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newStatus,
      insertAfterId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Creates a new task
 *
 * BACKEND RESPONSIBILITY:
 * - Generates order at the end of the list
 * - Only needs the last item's order (not all items!)
 *
 * @param task - Task data (without id)
 */
export async function createTask(
  task: Omit<
    Task,
    "id" | "createdAt" | "updatedAt" | "updatedStageAt" | "order"
  >
): Promise<Task> {
  // Get only the last task with the same status (not all tasks!)
  // This is the power of fractional indexing - only need the last item
  const response = await fetch(
    `${API_BASE_URL}/tasks?status=${task.status}&_sort=order&_order=desc&_limit=1`
  );
  const existingTasks: Task[] = await response.json();

  // BACKEND CALCULATION: Calculate order after the last item
  // Only need the last item's order, not all items!
  const lastOrder = existingTasks.length > 0 ? existingTasks[0].order : null;
  const { generateFractionalIndex } = await import("../utils/fractional-index");
  const newOrder = generateFractionalIndex(lastOrder, null); // Insert after last, or first if none

  const now = new Date().toISOString();
  const newTask: Task = {
    ...task,
    id: `task-${Date.now()}`,
    order: newOrder, // Backend-calculated order
    createdAt: now,
    updatedAt: now,
    updatedStageAt: now,
  };

  const createResponse = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newTask),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create task: ${createResponse.statusText}`);
  }

  return createResponse.json();
}

/**
 * Deletes a task
 *
 * @param taskId - ID of the task to delete
 */
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete task: ${response.statusText}`);
  }
}
