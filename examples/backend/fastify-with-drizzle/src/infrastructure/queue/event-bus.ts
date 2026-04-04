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

  private resolveQueueName(event: IDomainEvent): string {
    const eventClass = event.constructor as any;
    return eventClass.queueName ?? this.defaultQueueName;
  }

  async publish(event: IDomainEvent, options?: JobsOptions): Promise<void> {
    const queue = this.getQueue(this.resolveQueueName(event));
    await queue.add(event.eventName, event, {
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      ...options,
    });
  }

  async publishAll(
    events: IDomainEvent[],
    options?: JobsOptions
  ): Promise<void> {
    const byQueue = events.reduce<Record<string, IDomainEvent[]>>(
      (acc, event) => {
        const queueName = this.resolveQueueName(event);
        (acc[queueName] ??= []).push(event);
        return acc;
      },
      {}
    );

    await Promise.all(
      Object.entries(byQueue).map(([queueName, queueEvents]) =>
        this.getQueue(queueName).addBulk(
          queueEvents.map((event) => ({
            name: event.eventName,
            data: event,
            opts: {
              removeOnComplete: { age: 24 * 3600, count: 1000 },
              removeOnFail: { age: 7 * 24 * 3600 },
              attempts: 3,
              backoff: { type: "exponential" as const, delay: 2000 },
              ...options,
            },
          }))
        )
      )
    );
  }

  async close(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
  }
}
