import { DomainEvent } from "@woltz/rich-domain";
import { QUEUES } from "../../../constants";

export type UserCreatedEventPayload = {
  email: string;
};

export class UserCreatedEvent extends DomainEvent<UserCreatedEventPayload> {
  static readonly queueName = QUEUES.USERS;
}
