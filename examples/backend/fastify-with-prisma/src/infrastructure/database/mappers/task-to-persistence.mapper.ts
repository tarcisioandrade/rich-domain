import { PrismaClient } from "@prisma/client";
import { Task } from "../../../domain/task/task.entity";
import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { PrismaToPersistence } from "@woltz/rich-domain-prisma";

const schemaRegistry = new EntitySchemaRegistry().register({
  entity: "Task",
  table: "task",
});

export class PrismaTaskToPersistenceMapper extends PrismaToPersistence<
  Task,
  PrismaClient
> {
  protected readonly registry = schemaRegistry;

  protected async onCreate(task: Task) {
    await this.context.task.create({
      data: {
        id: task.id.value,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        labels: task.labels,
        order: task.order,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        updatedStageAt: task.updatedStageAt ?? new Date(),
      },
    });
  }
}
