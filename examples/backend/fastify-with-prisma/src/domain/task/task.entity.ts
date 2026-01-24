import {
  Aggregate,
  EntityHooks,
  EntityValidation,
  Id,
} from "@woltz/rich-domain";
import { z } from "zod";
import { TaskCreatedEvent } from "./events/task-create.event";

export const TaskStatus = z.enum([
  "todo",
  "doing",
  "done",
  "archived",
  "cancelled",
]);

export const TaskSchema = z.object({
  id: z.custom<Id>(),
  title: z.string().min(1),
  description: z.string(),
  status: TaskStatus,
  priority: z.string(),
  assignee: z.string(),
  labels: z.array(z.string()),
  order: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  updatedStageAt: z.date().nullable(),
});

export type TaskProps = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export type TaskEntities = {
  Task: Task;
};

export class Task extends Aggregate<TaskProps> {
  protected static validation: EntityValidation<TaskProps> = {
    schema: TaskSchema,
  };

  protected static hooks: EntityHooks<TaskProps, Task> = {
    onCreate: (entity) => {
      if (entity.isNew()) {
        entity.addDomainEvent(
          new TaskCreatedEvent({
            title: entity.props.title,
            status: entity.props.status,
          })
        );
      }
    },
  };

  static create(
    props: Omit<TaskProps, "id" | "createdAt" | "updatedAt">
  ): Task {
    return new Task({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public getTypedChanges() {
    return this.getChanges<TaskEntities>();
  }

  static restore(props: TaskProps): Task {
    return new Task(props);
  }

  updateTitle(title: string): void {
    if (title.trim().length === 0) {
      throw new Error("Title cannot be empty");
    }
    this.props.title = title;
    this.props.updatedAt = new Date();
  }

  updateDescription(description: string): void {
    this.props.description = description;
    this.props.updatedAt = new Date();
  }

  updateStatus(status: TaskStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
    this.props.updatedStageAt = new Date();
  }

  updatePriority(priority: string): void {
    this.props.priority = priority;
    this.props.updatedAt = new Date();
  }

  updateAssignee(assignee: string): void {
    this.props.assignee = assignee;
    this.props.updatedAt = new Date();
  }

  updateLabels(labels: string[]): void {
    this.props.labels = labels;
    this.props.updatedAt = new Date();
  }

  updateOrder(order: string): void {
    this.props.order = order;
    this.props.updatedAt = new Date();
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get status(): string {
    return this.props.status;
  }

  get priority(): string {
    return this.props.priority;
  }

  get assignee(): string {
    return this.props.assignee;
  }

  get labels(): string[] {
    return this.props.labels;
  }

  get order(): string {
    return this.props.order;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get updatedStageAt(): Date | null {
    return this.props.updatedStageAt;
  }
}
