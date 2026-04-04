import { randomUUID } from "node:crypto";
import { type DomainEvent } from "@woltz/rich-domain";
import { type Job, Worker, type WorkerOptions } from "bullmq";
import type { FastifyInstance } from "fastify";
import type IORedis from "ioredis";
import { QUEUES, type QueueName } from "../../constants";

type EventHandler<T extends Record<string, any>> = (
  event: DomainEvent<T>,
  app: FastifyInstance
) => Promise<void>;

type QueueWorkerConfig = {
  handlers: Map<string, EventHandler<any>>;
  settings?: Omit<WorkerOptions, "connection">;
};

export class BullMQDomainEventWorker {
  private workers: Record<QueueName, QueueWorkerConfig> = {
    [QUEUES.MAIN]: {
      handlers: new Map(),
      settings: { concurrency: 50 },
    },
    [QUEUES.USERS]: {
      handlers: new Map(),
      settings: { concurrency: 10 },
    },
  };

  private _app?: FastifyInstance;

  constructor(
    private readonly connection: IORedis,
    app?: FastifyInstance
  ) {
    this._app = app;
  }

  on<T extends Record<string, any>>(props: {
    queue: QueueName;
    event: new (...args: any[]) => DomainEvent<T>;
    handler: EventHandler<T>;
  }): void {
    const { queue, event, handler } = props;
    this.workers[queue].handlers.set(event.name, handler);
  }

  async start(): Promise<void> {
    if (!this._app) {
      throw new Error("FastifyInstance is required to start the worker.");
    }

    const app = this._app;

    for (const [queueName, workerConfig] of Object.entries(this.workers)) {
      new Worker(
        queueName,
        async (job: Job<DomainEvent<any>>) => {
          const handler = workerConfig.handlers.get(job.data.eventName);

          if (!handler) {
            const token = randomUUID();
            await job.moveToFailed(
              new Error(
                `No handler registered for event: ${job.data.eventName}`
              ),
              token
            );
            return;
          }

          await handler(job.data, app);
        },
        { ...workerConfig.settings, connection: this.connection }
      );
    }
  }

  async stop(): Promise<void> {
    await this.connection.quit();
  }
}
