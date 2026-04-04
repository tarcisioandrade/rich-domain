import { DomainEvent } from "@woltz/rich-domain";

export type UserCreatedEventPayload = {
  email: string;
};

export class UserCreatedEvent extends DomainEvent<UserCreatedEventPayload> {}
