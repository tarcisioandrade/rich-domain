import { Task } from "./task.entity";
import { Repository } from "@woltz/rich-domain";

export abstract class TaskRepository extends Repository<Task> {
  abstract findByOrderInStatus(
    order: string,
    status: string
  ): Promise<Task | null>;

  /**
   * Find the next order after a given order in a specific status.
   * Used for calculating fractional index when inserting between items.
   * This is an O(1) query with proper index on (status, order).
   */
  abstract findNextOrderInStatus(
    afterOrder: string,
    status: string
  ): Promise<string | null>;
}
