import { Prisma, PrismaClient } from "@prisma/client";
import {
  PrismaRepository,
  PrismaUnitOfWork,
  PrismaOutboxStore,
} from "@woltz/rich-domain-prisma";
import { TaskRepository } from "../../../domain/task/task.repository";
import { PrismaTaskToDomainMapper } from "../mappers/task-to-domain.mapper";
import { PrismaTaskToPersistenceMapper } from "../mappers/task-to-persistence.mapper";
import { TaskSchema } from "../schemas/task.schema";
import { Task, TaskStatus } from "../../../domain/task/task.entity";
import { Criteria } from "@woltz/rich-domain";

export class PrismaTaskRepository
  extends PrismaRepository<Task, TaskSchema, PrismaClient>
  implements TaskRepository
{
  protected get model() {
    return "task";
  }

  protected generateSearchQuery(search: string) {
    return [
      {
        title: { contains: search, mode: "insensitive" },
      },
      {
        description: { contains: search, mode: "insensitive" },
      },
    ] satisfies Prisma.TaskWhereInput[];
  }

  constructor(
    prisma: PrismaClient,
    uow: PrismaUnitOfWork,
    outboxStore?: PrismaOutboxStore
  ) {
    super(
      new PrismaTaskToPersistenceMapper(prisma, uow),
      new PrismaTaskToDomainMapper(),
      prisma,
      uow,
      outboxStore
    );
  }

  async findByStatusOrderedByOrder(status: TaskStatus): Promise<Task[]> {
    const criteria = Criteria.create<Task>()
      .whereEquals("status", status)
      .orderByAsc("order")
      .paginate(1, 1000);

    const result = await this.find(criteria);
    return result.data;
  }

  async findByOrderInStatus(
    order: string,
    status: string
  ): Promise<Task | null> {
    const task = await this.context.task.findFirst({
      where: {
        order,
        status,
      },
    });

    return task ? this.toDomainMapper.build(task) : null;
  }

  /**
   * Find the next order after a given order in a specific status.
   * This is an O(1) query with proper index on (status, order).
   */
  async findNextOrderInStatus(
    afterOrder: string,
    status: string
  ): Promise<string | null> {
    const task = await this.context.task.findFirst({
      where: {
        status,
        order: { gt: afterOrder },
      },
      orderBy: { order: "asc" },
      select: { order: true },
    });

    return task?.order ?? null;
  }
}
