import { JobsOptions, Queue } from "bullmq";
import IORedis from "ioredis";
import { IDomainEvent, IDomainEventBus } from "@woltz/rich-domain";
import { QUEUES } from "../../constants";

export class BullMQEventBus implements IDomainEventBus {
  private queues: Map<string, Queue<IDomainEvent>> = new Map();
  private defaultQueueName = QUEUES.MAIN;

  constructor(private readonly connection: IORedis) {}

  private getQueue(queueName: string): Queue<IDomainEvent> {
    if (!this.queues.has(queueName)) {
      this.queues.set(
        queueName,
        new Queue<IDomainEvent>(queueName, { connection: this.connection })
      );
    }
    return this.queues.get(queueName)!;
  }

  async publish(event: IDomainEvent, options?: JobsOptions): Promise<void> {
    const queue = this.getQueue(this.defaultQueueName);
    await queue.add(event.eventName, event, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      ...options,
    });
  }

  async publishAll(events: IDomainEvent[], options?: JobsOptions): Promise<void> {
    const queue = this.getQueue(this.defaultQueueName);
    await queue.addBulk(
      events.map((event) => ({
        name: event.eventName,
        data: event,
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: { type: "exponential" as const, delay: 2000 },
          ...options,
        },
      }))
    );
  }

  async close(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
  }
}
