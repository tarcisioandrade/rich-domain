import { ConfigurationError, DomainEvent } from "@woltz/rich-domain";
import { Job, Worker, WorkerOptions } from "bullmq";
import IORedis from "ioredis";
import { randomUUID } from "crypto";
import { QUEUES } from "../../constants";
import { QueueName } from "./queue-publisher";

type QueueWorkerHandler = {
  handler: (event: DomainEvent<any>) => Promise<any>;
};

export class BullMQDomainEventWorker {
  private workers: Record<
    string,
    {
      handlers: Map<string, QueueWorkerHandler>;
      settings?: WorkerOptions;
    }
  > = {
    [QUEUES.MAIN]: {
      handlers: new Map<string, QueueWorkerHandler>(),
      settings: {
        concurrency: 50,
      } as WorkerOptions,
    },
    [QUEUES.NOTIFICATION_EVENTS]: {
      handlers: new Map<string, QueueWorkerHandler>(),
      settings: {
        concurrency: 10,
      } as WorkerOptions,
    },
    [QUEUES.WORKFLOW_EVENTS]: {
      handlers: new Map<string, QueueWorkerHandler>(),
      settings: {
        concurrency: 5,
      } as WorkerOptions,
    },
  };

  private _connection: IORedis;

  constructor(connection: IORedis) {
    this._connection = connection;
  }

  public on<T extends Record<string, any> = Record<string, any>>(props: {
    queue: QueueName;
    event: new (...args: any[]) => DomainEvent<T>;
    handler: (event: DomainEvent<T>) => Promise<void>;
  }) {
    const { queue, event, handler } = props;
    const eventName = event.name;

    if (!this.workers[queue]) {
      throw new ConfigurationError(
        `Queue "${queue}" not configured in DomainEventWorker`
      );
    }

    this.workers[queue].handlers.set(eventName, { handler });
  }

  public async start() {
    for (const [workerName, worker] of Object.entries(this.workers)) {
      const onJobHandler = async (job: Job<DomainEvent<any>>) => {
        const workerProps = worker.handlers.get(job.data.eventName);
        const token = randomUUID();

        if (!workerProps) {
          const error = new ConfigurationError(
            `Handler not found for event: ${job.data.eventName}`
          );
          await job.moveToFailed(error, token);
          return;
        }

        return await workerProps.handler(job.data);
      };

      // Creating the Worker automatically starts it in BullMQ v5
      const bullWorker = new Worker(workerName, onJobHandler, {
        ...worker?.settings,
        connection: this._connection,
      });
    }
  }

  async stop() {
    await this._connection.quit();
  }
}
