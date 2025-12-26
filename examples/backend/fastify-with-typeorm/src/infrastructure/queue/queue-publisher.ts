import { QUEUES } from "../../constants";
import { DomainEvent } from "@woltz/rich-domain";
import { Queue, JobsOptions } from "bullmq";
import IORedis from "ioredis";

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * QueuePublisher - Publish jobs to specific queues
 * Use this when you need to publish to queues other than the default domain-events queue
 */
export class QueuePublisher {
  private queues: Map<QueueName, Queue> = new Map();

  constructor(private connection: IORedis) {}

  async publish<T extends DomainEvent<any>>(
    queueName: QueueName,
    event: T,
    options?: JobsOptions
  ): Promise<void> {
    const queue = this.getOrCreateQueue(queueName);
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

  private getOrCreateQueue(queueName: QueueName): Queue {
    if (!this.queues.has(queueName)) {
      this.queues.set(
        queueName,
        new Queue(queueName, { connection: this.connection })
      );
    }
    return this.queues.get(queueName)!;
  }

  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close())
    );
  }
}
