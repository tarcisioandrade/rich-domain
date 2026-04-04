import { QUEUES } from "../../../constants";
import { UserCreatedEvent } from "../../../domain/user/events/user-create.event";
import type { BullMQDomainEventWorker } from "../../../infrastructure/queue/event-worker";

export function registerUserEventHandlers(
  worker: BullMQDomainEventWorker
): void {
  worker.on({
    queue: QUEUES.USERS,
    event: UserCreatedEvent,
    handler: async (event, app) => {
      app.log.info(
        { email: event.payload.email },
        `[UserCreatedEvent] user created: ${event.payload.email}`
      );
    },
  });
}
