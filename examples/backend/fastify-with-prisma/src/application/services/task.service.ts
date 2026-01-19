import { Task, TaskStatus, TaskStatus as TaskStatusType } from "../../domain/task/task.entity";
import { TaskRepository } from "../../domain/task/task.repository";
import { Criteria, Id, IDomainEventBus } from "@woltz/rich-domain";
import { Transactional } from "@woltz/rich-domain-prisma";
import { uow } from "../../infrastructure/database/prisma";
import { generateFractionalIndex } from "../../utils/fractional-index";

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

  /**
   * Move a task to a new status and position.
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
  async moveTask(
    taskId: string,
    newStatus: TaskStatusType,
    insertAfterId: string | null
  ): Promise<Task> {
    const task = await this.getById(taskId);

    let prevOrder: string | null = null;
    let nextOrder: string | null = null;

    if (insertAfterId === null) {
      // Insert at the beginning - find the first item's order
      const firstOrder = await this.taskRepository.findNextOrderInStatus(
        "", // Empty string is less than any fractional index
        newStatus
      );
      nextOrder = firstOrder;
    } else {
      // Insert after a specific task
      const insertAfterTask = await this.taskRepository.findById(insertAfterId);

      if (!insertAfterTask) {
        throw new Error(`Reference task ${insertAfterId} not found`);
      }

      // Verify the reference task is in the target status
      if (insertAfterTask.status !== newStatus) {
        throw new Error(
          `Reference task ${insertAfterId} is not in status ${newStatus}`
        );
      }

      prevOrder = insertAfterTask.order;

      // Find the next order after the reference task (O(1) query with index)
      nextOrder = await this.taskRepository.findNextOrderInStatus(
        prevOrder,
        newStatus
      );
    }

    // Calculate the new order between prev and next
    const newOrder = generateFractionalIndex(prevOrder, nextOrder);

    task.updateStatus(newStatus);
    task.updateOrder(newOrder);

    if (process.env.NODE_ENV === "development") {
      console.dir({
        moveTask: {
          taskId,
          newStatus,
          insertAfterId,
          prevOrder,
          nextOrder,
          calculatedOrder: newOrder,
          changes: task.getTypedChanges()
        }
      }, { depth: null });
    }

    await this.taskRepository.save(task);

    return task;
  }
}
