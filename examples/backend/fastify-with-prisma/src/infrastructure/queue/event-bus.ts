import { JobsOptions, Queue } from "bullmq";
import IORedis from "ioredis";
import { IDomainEvent, IDomainEventBus } from "@woltz/rich-domain";
import { QUEUES } from "../../constants";

export class BullMQEventBus implements IDomainEventBus {
  private queues: Map<string, Queue<IDomainEvent>> = new Map();
  private connection: IORedis;
  private defaultQueueName = QUEUES.MAIN;

  constructor(connection: IORedis) {
    this.connection = connection;
  }

  private getQueue(queueName: string): Queue<IDomainEvent> {
    if (!this.queues.has(queueName)) {
      this.queues.set(
        queueName,
        new Queue<IDomainEvent>(queueName, { connection: this.connection })
      );
    }
    return this.queues.get(queueName)!;
  }

  private getQueueNameForEvent(event: IDomainEvent): string {
    const eventClass = event.constructor as any;
    return eventClass.queueName || this.defaultQueueName;
  }

  async publish(event: IDomainEvent, options?: JobsOptions): Promise<void> {
    const queueName = this.getQueueNameForEvent(event);
    const queue = this.getQueue(queueName);

    await queue.add(event.eventName, event, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      ...options,
    });
  }

  async publishAll(
    events: IDomainEvent[],
    options?: JobsOptions
  ): Promise<void> {
    const eventsByQueue = events.reduce(
      (acc, event) => {
        const queueName = this.getQueueNameForEvent(event);
        if (!acc[queueName]) {
          acc[queueName] = [];
        }
        acc[queueName].push(event);
        return acc;
      },
      {} as Record<string, IDomainEvent[]>
    );

    await Promise.all(
      Object.entries(eventsByQueue).map(([queueName, queueEvents]) => {
        const queue = this.getQueue(queueName);
        return queue.addBulk(
          queueEvents.map((event) => ({
            name: event.eventName,
            data: event,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
            ...options,
          }))
        );
      })
    );
  }

  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close())
    );
  }
}
