import { DomainEventBus } from "@woltz/rich-domain";
import { UserCreatedEvent } from "../../domain/user/events/user-create.event";

export const EVENT_BUS = DomainEventBus.getInstance();

EVENT_BUS.subscribe({
  event: UserCreatedEvent,
  handler: (event: UserCreatedEvent) => {
    console.log("User Created Event", event);
  },
});

EVENT_BUS.subscribeAll((event) => {
  console.log("Event received");
  event;
});
