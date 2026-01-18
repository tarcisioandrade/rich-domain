import { Task } from "./task.entity";
import { Repository } from "@woltz/rich-domain";

export abstract class TaskRepository extends Repository<Task> {
  abstract findByOrderInStatus(
    order: string,
    status: string
  ): Promise<Task | null>;
}
