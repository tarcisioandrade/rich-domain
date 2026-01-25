/**
 * Service factory that switches between mock and real API implementations
 *
 * Set VITE_USE_MOCK_DATA=true in .env to use mock data (no backend needed)
 * Set VITE_USE_MOCK_DATA=false or omit to use real API calls
 */
import * as realService from "./get-tasks";
import * as mockService from "./get-tasks.mock";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === "true";

// Re-export types
export type { Task, MoveTaskParams } from "./get-tasks";

// Export service functions based on environment
export const getTasks = USE_MOCK ? mockService.getTasks : realService.getTasks;
export const moveTask = USE_MOCK ? mockService.moveTask : realService.moveTask;
export const createTask = USE_MOCK
  ? mockService.createTask
  : realService.createTask;
export const deleteTask = USE_MOCK
  ? mockService.deleteTask
  : realService.deleteTask;

// Mock-only exports (only available when using mock service)
export const resetTasks = USE_MOCK
  ? mockService.resetTasks
  : () => {
      console.warn("resetTasks is only available in mock mode");
    };
export const getTaskCount = USE_MOCK
  ? mockService.getTaskCount
  : () => {
      console.warn("getTaskCount is only available in mock mode");
      return 0;
    };

// Export update task (mock has it, real doesn't - could be added)
export const updateTask = USE_MOCK
  ? mockService.updateTask
  : async () => {
      throw new Error("updateTask not implemented in real service");
    };
