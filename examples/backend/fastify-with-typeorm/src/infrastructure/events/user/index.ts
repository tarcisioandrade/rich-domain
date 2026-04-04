import { BullMQDomainEventWorker } from "../../queue/event-worker";
import { QUEUES } from "../../../constants";
import { UserCreatedEvent } from "../../../domain/user/events/user-create.event";

export function registerUserEventHandlers(
  worker: BullMQDomainEventWorker
): void {
  worker.on({
    queue: QUEUES.MAIN,
    event: UserCreatedEvent,
    handler: async (event, app) => {
      app.log.info(
        { email: event.payload.email },
        `[UserCreatedEvent] user created: ${event.payload.email}`
      );
    },
  });
}
