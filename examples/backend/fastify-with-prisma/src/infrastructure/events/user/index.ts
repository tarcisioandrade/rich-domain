import { BullMQDomainEventWorker } from "../../queue/event-worker";
import { QUEUES } from "../../../constants";
import { UserCreatedEvent } from "../../../domain/user/events/user-create.event";

export function registerUserEventHandlers(worker: BullMQDomainEventWorker) {
  worker.on({
    queue: QUEUES.MAIN,
    event: UserCreatedEvent,
    handler: async (event) => {
      throw new Error("test");
      console.log("   Email:", event.payload.email);
    },
  });
}
