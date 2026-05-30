import { ConfigurationError, DomainEvent } from "@woltz/rich-domain";
import { Job, Worker, WorkerOptions } from "bullmq";
import IORedis from "ioredis";
import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { QUEUES } from "../../constants";
import { QueueName } from "./queue-publisher";

type EventHandler<T extends Record<string, any>> = (
  event: DomainEvent<T>,
  app: FastifyInstance
) => Promise<void>;

type QueueWorkerConfig = {
  handlers: Map<string, EventHandler<any>>;
  settings?: WorkerOptions;
};

export class BullMQDomainEventWorker {
  private workers: Record<string, QueueWorkerConfig> = {
    [QUEUES.MAIN]: {
      handlers: new Map(),
      settings: { concurrency: 50 } as WorkerOptions,
    },
    [QUEUES.NOTIFICATION_EVENTS]: {
      handlers: new Map(),
      settings: { concurrency: 10 } as WorkerOptions,
    },
    [QUEUES.WORKFLOW_EVENTS]: {
      handlers: new Map(),
      settings: { concurrency: 5 } as WorkerOptions,
    },
  };

  private _app?: FastifyInstance;

  constructor(
    private readonly connection: IORedis,
    app?: FastifyInstance
  ) {
    this._app = app;
  }

  public on<T extends Record<string, any> = Record<string, any>>(props: {
    queue: QueueName;
    event: new (...args: any[]) => DomainEvent<T>;
    handler: EventHandler<T>;
  }): void {
    const { queue, event, handler } = props;

    if (!this.workers[queue]) {
      throw new ConfigurationError(
        `Queue "${queue}" not configured in DomainEventWorker`
      );
    }

    this.workers[queue].handlers.set(event.name, handler);
  }

  public async start(): Promise<void> {
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
        { ...workerConfig.settings, connection: this.connection.options }
      );
    }
  }

  async stop(): Promise<void> {
    await this.connection.quit();
  }
}
