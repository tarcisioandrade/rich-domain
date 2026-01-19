import { Id, Mapper } from "@woltz/rich-domain";
import { TaskSchema } from "../schemas/task.schema";
import { Task, TaskStatus } from "../../../domain/task/task.entity";

export class PrismaTaskToDomainMapper extends Mapper<TaskSchema, Task> {
  public build(task: TaskSchema): Task {
    return new Task({
      id: new Id(task.id),
      title: task.title,
      description: task.description,
      status: TaskStatus.parse(task.status),
      priority: task.priority,
      assignee: task.assignee,
      labels: task.labels,
      order: task.order,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      updatedStageAt: task.updatedStageAt,
    });
  }
}
