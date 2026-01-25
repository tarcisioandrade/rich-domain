import {
  PaginatedResult,
  type Criteria,
  type PaginatedJsonResult,
} from "@woltz/rich-domain";
import {
  generateFractionalIndex,
  generateIndexForMove,
} from "../utils/fractional-index";
import { generateMockTasks } from "./mock-tasks";
import type { Task } from "./get-tasks";

/**
 * In-memory task store (resets on page reload)
 */
let tasks: Task[] = generateMockTasks();

/**
 * Simulates network latency for realistic behavior
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compares two order strings using simple lexicographic comparison
 * This matches the behavior expected by the kanban frontend
 */
function compareOrder(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Fetches tasks with criteria filtering (mock implementation)
 *
 * @param criteria - Criteria instance with filters, sorting, and pagination
 * @returns Paginated result with tasks
 */
export async function getTasks(
  criteria: Criteria<Task>
): Promise<PaginatedJsonResult<Task>> {
  // Simulate network latency
  await delay(100 + Math.random() * 150);

  // Use PaginatedResult.fromArray to apply criteria filtering
  const result = PaginatedResult.fromArray<Task>(tasks, criteria);
  return result.toJSON();
}

/**
 * Updates a task's status and position (mock implementation)
 *
 * Uses "Insert Reference" pattern:
 * - Receives the ID of the task that should be ABOVE the moved task
 * - Calculates correct order using the same logic as frontend (generateIndexForMove)
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
  // Simulate network latency
  await delay(50 + Math.random() * 100);

  const taskIndex = tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    throw new Error("Task not found");
  }

  // Get tasks in the target column sorted by order (excluding the moved task)
  const columnTasks = tasks
    .filter((t) => t.status === newStatus && t.id !== taskId)
    .sort((a, b) => compareOrder(a.order, b.order));

  // Calculate toIndex from insertAfterId to use the same logic as frontend
  let toIndex: number;
  if (insertAfterId === null) {
    // Insert at the top
    toIndex = 0;
  } else {
    // Insert after the specified task
    const afterIndex = columnTasks.findIndex((t) => t.id === insertAfterId);
    if (afterIndex === -1) {
      // If reference task not found, append to end
      toIndex = columnTasks.length;
    } else {
      // Insert right after the found task
      toIndex = afterIndex + 1;
    }
  }

  // Use the same function as the frontend for consistent order calculation
  const newOrder = generateIndexForMove(columnTasks, toIndex);

  // Update the task
  const now = new Date().toISOString();
  const updatedTask: Task = {
    ...tasks[taskIndex],
    status: newStatus,
    order: newOrder,
    updatedAt: now,
    updatedStageAt: now,
  };

  tasks[taskIndex] = updatedTask;
  return updatedTask;
}

/**
 * Creates a new task (mock implementation)
 *
 * @param task - Task data (without id, timestamps, and order)
 */
export async function createTask(
  task: Omit<
    Task,
    "id" | "createdAt" | "updatedAt" | "updatedStageAt" | "order"
  >
): Promise<Task> {
  // Simulate network latency
  await delay(100 + Math.random() * 150);

  // Get the last task in the same status column
  const columnTasks = tasks
    .filter((t) => t.status === task.status)
    .sort((a, b) => compareOrder(a.order, b.order));

  const lastOrder =
    columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].order : null;
  const newOrder = generateFractionalIndex(lastOrder, null);

  const now = new Date().toISOString();
  const newTask: Task = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    order: newOrder,
    createdAt: now,
    updatedAt: now,
    updatedStageAt: now,
  };

  tasks.push(newTask);
  return newTask;
}

/**
 * Deletes a task (mock implementation)
 *
 * @param taskId - ID of the task to delete
 */
export async function deleteTask(taskId: string): Promise<void> {
  // Simulate network latency
  await delay(50 + Math.random() * 100);

  const taskIndex = tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    throw new Error("Task not found");
  }

  tasks.splice(taskIndex, 1);
}

/**
 * Updates a task's properties (mock implementation)
 *
 * @param taskId - ID of the task to update
 * @param updates - Partial task data to update
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, "id" | "createdAt" | "order">>
): Promise<Task> {
  // Simulate network latency
  await delay(50 + Math.random() * 100);

  const taskIndex = tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    throw new Error("Task not found");
  }

  const now = new Date().toISOString();
  const updatedTask: Task = {
    ...tasks[taskIndex],
    ...updates,
    updatedAt: now,
  };

  // If status changed, update stage timestamp
  if (updates.status && updates.status !== tasks[taskIndex].status) {
    updatedTask.updatedStageAt = now;
  }

  tasks[taskIndex] = updatedTask;
  return updatedTask;
}

/**
 * Resets tasks to initial mock data (useful for testing)
 */
export function resetTasks(): void {
  tasks = generateMockTasks();
}

/**
 * Gets current task count (useful for debugging)
 */
export function getTaskCount(): number {
  return tasks.length;
}
