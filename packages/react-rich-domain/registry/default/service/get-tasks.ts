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
 * Builds query parameters from Criteria for json-server
 * json-server supports: _page, _limit, _sort, _order, field_like, field
 */
// function buildQueryParams(criteria: Criteria<Task>): URLSearchParams {
//   const params = new URLSearchParams();

//   // Pagination
//   const pagination = criteria.getPagination();
//   params.set("_page", String(pagination.page));
//   params.set("_limit", String(pagination.limit));

//   // Sorting - always include order as secondary sort
//   const orders = criteria.getOrders();
//   if (orders.length > 0) {
//     const sortFields = orders.map((o) => o.field);
//     const sortOrders = orders.map((o) => o.direction);

//     // Add order as secondary sort if not already present
//     if (!sortFields.includes("order")) {
//       sortFields.push("order");
//       sortOrders.push("asc");
//     }

//     params.set("_sort", sortFields.join(","));
//     params.set("_order", sortOrders.join(","));
//   } else {
//     // Default sort by order (fractional index strings sort lexicographically)
//     params.set("_sort", "order");
//     params.set("_order", "asc");
//   }

//   // Filters
//   const filters = criteria.getFilters();
//   for (const filter of filters) {
//     const { field, operator, value } = filter;

//     if (value === null || value === undefined) continue;

//     switch (operator) {
//       case "equals":
//         params.set(field, String(value));
//         break;
//       case "contains":
//         params.set(`${field}_like`, String(value));
//         break;
//       case "in":
//         // json-server doesn't support 'in' natively, but we can use multiple params
//         if (Array.isArray(value)) {
//           value.forEach((v) => params.append(field, String(v)));
//         }
//         break;
//       case "greaterThan":
//         params.set(`${field}_gte`, String(value));
//         break;
//       case "lessThan":
//         params.set(`${field}_lte`, String(value));
//         break;
//       default:
//         // For other operators, use simple equality
//         params.set(field, String(value));
//     }
//   }

//   // Search - json-server doesn't support full-text search with 'q'
//   // We need to search in specific fields using _like
//   // For tasks, we'll search in title (most common search field)
//   // Note: json-server limitation - can't easily search multiple fields with OR
//   // In a real backend, you'd implement proper full-text search across multiple fields
//   if (criteria.hasSearch()) {
//     const search = criteria.getSearch();
//     if (search && search.trim()) {
//       // Search in title field using _like (case-insensitive partial match)
//       params.set("title_like", String(search));
//     }
//   }

//   return params;
// }

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
  newOrder: number;
}

/**
 * Updates a task's status and order (for moving between columns)
 *
 * BACKEND RESPONSIBILITY:
 * - Validates the proposed order
 * - Recalculates order using ONLY prevOrder and nextOrder (power of fractional indexing!)
 * - Ensures consistency (backend is source of truth)
 *
 * IMPORTANT: With fractional indexing, backend only needs prevOrder and nextOrder!
 * No need to fetch all items - that's the whole point of fractional indexing.
 *
 * @param taskId - ID of the task to update
 * @param newStatus - New status value
 * @param proposedOrder - Proposed fractional index (suggestion from client)
 * @param prevOrder - Order of item before target position (null if first)
 * @param nextOrder - Order of item after target position (null if last)
 */
export async function moveTask(
  taskId: string,
  newStatus: Task["status"],
  proposedOrder: string,
  prevOrder: string | null,
  nextOrder: string | null
): Promise<Task> {
  const url = `${API_BASE_URL}/tasks/${taskId}/move`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newStatus,
      proposedOrder,
      prevOrder,
      nextOrder,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Reorders tasks within a column
 * Updates the order of multiple tasks in a batch
 *
 * @param updates - Array of task ID and new fractional index pairs
 */
export async function reorderTasks(
  updates: Array<{ taskId: string; order: string }>
): Promise<void> {
  const url = `${API_BASE_URL}/tasks/reorder`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error(`Failed to reorder tasks: ${response.statusText}`);
  }
  return;
}

/**
 * Updates a task's status (legacy function for compatibility)
 *
 * @param taskId - ID of the task to update
 * @param newStatus - New status value
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: Task["status"]
): Promise<Task> {
  const url = `${API_BASE_URL}/tasks/${taskId}`;

  // First, get the current task
  const getResponse = await fetch(url);
  if (!getResponse.ok) {
    throw new Error(`Failed to fetch task: ${getResponse.statusText}`);
  }

  const currentTask: Task = await getResponse.json();
  const now = new Date().toISOString();

  // Update the task with new status
  const updatedTask: Task = {
    ...currentTask,
    status: newStatus,
    updatedAt: now,
    updatedStageAt: now,
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedTask),
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
