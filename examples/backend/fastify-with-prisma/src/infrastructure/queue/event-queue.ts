import { Queue } from "bullmq";
import { IDomainEvent } from "@woltz/rich-domain";
import IORedis from "ioredis";

export const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

export const DomainEventQueue = new Queue<IDomainEvent>("domain-events", {
  connection,
});

/**
 * Publish a domain event to BullMQ queue
 */
export async function enqueueDomainEvent(event: IDomainEvent) {
  await DomainEventQueue.add(event.eventName, event);
}
