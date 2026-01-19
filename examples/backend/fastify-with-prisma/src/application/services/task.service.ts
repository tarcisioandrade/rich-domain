import { Task, TaskStatus, TaskStatus as TaskStatusType } from "../../domain/task/task.entity";
import { TaskRepository } from "../../domain/task/task.repository";
import { Criteria, Id, IDomainEventBus } from "@woltz/rich-domain";
import { Transactional } from "@woltz/rich-domain-prisma";
import { uow } from "../../infrastructure/database/prisma";
import { generateFractionalIndex, isValidFractionalIndex } from "../../utils/fractional-index";

interface CreateTaskInput {
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  labels: string[];
  order: string;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  order?: string;
}

export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventBus: IDomainEventBus
  ) {}

  @Transactional(uow)
  async create(input: CreateTaskInput): Promise<Task> {
    const status = TaskStatus.parse(input.status);

    const task = new Task({
      id: new Id(),
      title: input.title,
      description: input.description,
      status: status,
      priority: input.priority,
      assignee: input.assignee,
      labels: input.labels,
      order: input.order,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedStageAt: null,
    });

    await this.taskRepository.save(task);
    await task.dispatchAll(this.eventBus);

    return task;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const task = await this.taskRepository.findById(id);

    if (!task) {
      throw new Error("Task not found");
    }

    if (input.title !== undefined) {
      task.updateTitle(input.title);
    }
    if (input.description !== undefined) {
      task.updateDescription(input.description);
    }
    if (input.status !== undefined) {
      const status = TaskStatus.parse(input.status);
      task.updateStatus(status);
    }
    if (input.priority !== undefined) {
      task.updatePriority(input.priority);
    }
    if (input.assignee !== undefined) {
      task.updateAssignee(input.assignee);
    }
    if (input.labels !== undefined) {
      task.updateLabels(input.labels);
    }
    if (input.order !== undefined) {
      task.updateOrder(input.order);
    }

    await this.taskRepository.save(task);

    return task;
  }

  async list(criteria: Criteria) {
    return await this.taskRepository.find(criteria);
  }

  async getById(id: string): Promise<Task> {
    const task = await this.taskRepository.findById(id);

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  }

  async delete(id: string): Promise<void> {
    const task = await this.taskRepository.findById(id);

    if (!task) {
      throw new Error("Task not found");
    }

    await this.taskRepository.delete(task);
  }

  async moveTask(
    taskId: string,
    newStatus: TaskStatusType,
    proposedOrder: string,
    prevOrder: string | null,
    nextOrder: string | null
  ): Promise<Task> {
    const task = await this.getById(taskId);

    if (prevOrder !== null) {
      const prevTask = await this.taskRepository.findByOrderInStatus(
        prevOrder,
        newStatus
      );
      if (!prevTask) {
        throw new Error(
          `Previous task with order ${prevOrder} not found in status ${newStatus}`
        );
      }
    }

    if (nextOrder !== null) {
      const nextTask = await this.taskRepository.findByOrderInStatus(
        nextOrder,
        newStatus
      );
      if (!nextTask) {
        throw new Error(
          `Next task with order ${nextOrder} not found in status ${newStatus}`
        );
      }
    }

    if (prevOrder !== null && nextOrder !== null && prevOrder >= nextOrder) {
      throw new Error(
        `Invalid order: prevOrder (${prevOrder}) must be less than nextOrder (${nextOrder})`
      );
    }

    const validatedOrder = generateFractionalIndex(prevOrder, nextOrder);

    if (proposedOrder !== validatedOrder && process.env.NODE_ENV === "development") {
      console.warn(
        `Order mismatch: proposed=${proposedOrder}, validated=${validatedOrder}. Using validated value.`
      );
    }

    task.updateStatus(newStatus);
    task.updateOrder(validatedOrder);

    await this.taskRepository.save(task);

    return task;
  }

  async reorderTasks(
    updates: Array<{ taskId: string; order: string }>
  ): Promise<void> {
    const ids = updates.map((update) => update.taskId);
    const tasks = await this.taskRepository.findManyByIds(ids);

    console.log('updates', updates)
    if (tasks.length !== ids.length) {
      throw new Error(`Some tasks not found: ${ids.filter((id) => !tasks.some((task) => task.id.value === id)).join(", ")}`);
    }

    const statusGroups = new Map<string, Task[]>();
    for (const task of tasks) {
      const status = task.status;
      if (!statusGroups.has(status)) {
        statusGroups.set(status, []);
      }
      statusGroups.get(status)!.push(task);
    }

    for (const [status, statusTasks] of statusGroups.entries()) {
      const orders = updates
        .filter((update) =>
          statusTasks.some((task) => task.id.value === update.taskId)
        )
        .map((update) => update.order);

      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        throw new Error(
          `Duplicate orders found in status ${status}. Each task must have a unique order.`
        );
      }
    }

    for (const update of updates) {
      const task = tasks.find((t) => t.id.value === update.taskId);
      if (!task) {
        continue;
      }

      if (!update.order || update.order.trim() === "") {
        if (!isValidFractionalIndex(update.order)) {
          throw new Error(`Invalid order for task ${update.taskId}: empty order`);
        }
      }

      task.updateOrder(update.order);
      await this.taskRepository.save(task);
    }
  }
}
