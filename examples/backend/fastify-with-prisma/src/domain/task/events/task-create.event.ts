import { DomainEvent } from "@woltz/rich-domain";

export type TaskCreatedEventPayload = {
  title: string;
  status: string;
};

export class TaskCreatedEvent extends DomainEvent<TaskCreatedEventPayload> {}
