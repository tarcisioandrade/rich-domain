# Domain Events

Cross-aggregate communication using events with async processing via BullMQ.

## Defining Events

```typescript
import { DomainEvent } from "@woltz/rich-domain";

// Define payload type
export type UserCreatedEventPayload = {
  email: string;
};

// Create event class
export class UserCreatedEvent extends DomainEvent<UserCreatedEventPayload> {}
```

## Emitting Events in Aggregates

### Using Lifecycle Hooks (Recommended)

```typescript
import { Aggregate, EntityHooks, Id } from "@woltz/rich-domain";
import { UserCreatedEvent } from "./events/user-create.event";

export class User extends Aggregate<UserProps> {
  protected static hooks: EntityHooks<UserProps, User> = {
    onCreate: (entity) => {
      if (entity.isNew()) {
        entity.addDomainEvent(
          new UserCreatedEvent({
            email: entity.props.email,
          })
        );
      }
    },
  };
}
```

### Using Domain Methods

```typescript
class Order extends Aggregate<OrderProps> {
  confirm(): void {
    if (this.props.items.length === 0) {
      throw new DomainError("Cannot confirm empty order");
    }

    this.props.status = "confirmed";

    this.addDomainEvent(
      new OrderConfirmedEvent({
        orderId: this.id.value,
        total: this.total,
        customerId: this.props.customerId,
      })
    );
  }
}
```

## Dispatching Events

Events are dispatched **after** persistence to ensure consistency.

> **Reliability:** For guaranteed delivery when the process crashes or the broker is down between `save()` and `dispatchAll()`, use the **[Transactional Outbox](./outbox.md)** (`@woltz/rich-domain-outbox`).

```typescript
import { IDomainEventBus } from "@woltz/rich-domain";

class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: IDomainEventBus
  ) {}

  @Transactional(uow)
  async create(input: CreateUserInput): Promise<User> {
    const user = new User({
      id: new Id(),
      email: input.email,
      name: input.name,
      posts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1. Persist first
    await this.userRepository.save(user);

    // 2. Dispatch events after successful save
    await user.dispatchAll(this.eventBus);

    return user;
  }
}
```

## BullMQ Implementation

### Redis Connection

```typescript
// infrastructure/queue/connection.ts
import IORedis from "ioredis";

export const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null, // Required for BullMQ
});
```

### Queue Constants

```typescript
// constants.ts
export const QUEUES = {
  MAIN: "main-queue",
  WORKFLOW_EVENTS: "workflow-events",
  NOTIFICATION_EVENTS: "notification-events",
} as const;
```

### Event Bus (Publisher)

```typescript
// infrastructure/queue/event-bus.ts
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
    // Group events by queue
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

    // Bulk add to each queue
    await Promise.all(
      Object.entries(eventsByQueue).map(([queueName, queueEvents]) => {
        const queue = this.getQueue(queueName);
        return queue.addBulk(
          queueEvents.map((event) => ({
            name: event.eventName,
            data: event,
            opts: {
              removeOnComplete: true,
              removeOnFail: false,
              attempts: 3,
              backoff: { type: "exponential", delay: 2000 },
              ...options,
            },
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
```

### Event Worker (Consumer)

```typescript
// infrastructure/queue/event-worker.ts
import { ConfigurationError, DomainEvent } from "@woltz/rich-domain";
import { Job, Worker, WorkerOptions } from "bullmq";
import IORedis from "ioredis";
import { randomUUID } from "crypto";
import { QUEUES } from "../../constants";

type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

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
      handlers: new Map(),
      settings: { concurrency: 50 },
    },
    [QUEUES.NOTIFICATION_EVENTS]: {
      handlers: new Map(),
      settings: { concurrency: 10 },
    },
    [QUEUES.WORKFLOW_EVENTS]: {
      handlers: new Map(),
      settings: { concurrency: 5 },
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

      new Worker(workerName, onJobHandler, {
        ...worker?.settings,
        connection: this._connection,
      });
    }
  }

  async stop() {
    await this._connection.quit();
  }
}
```

## Registering Event Handlers

```typescript
// infrastructure/events/user/index.ts
import { BullMQDomainEventWorker } from "../../queue/event-worker";
import { QUEUES } from "../../../constants";
import { UserCreatedEvent } from "../../../domain/user/events/user-create.event";

export function registerUserEventHandlers(worker: BullMQDomainEventWorker) {
  worker.on({
    queue: QUEUES.MAIN,
    event: UserCreatedEvent,
    handler: async (event) => {
      console.log("User created:", event.payload.email);
      // Send welcome email, create audit log, etc.
    },
  });
}
```

## Worker Entry Point

```typescript
// worker.ts
import "dotenv/config";
import { registerUserEventHandlers } from "./infrastructure/events/user";
import { BullMQDomainEventWorker, connection } from "./infrastructure/queue";

export const worker = new BullMQDomainEventWorker(connection);

// Register all handlers
registerUserEventHandlers(worker);

async function main() {
  try {
    console.log("Starting domain event worker...");
    await worker.start();
    console.log("Domain event worker started successfully");
  } catch (error) {
    console.error("Failed to start domain event worker:", error);
    await worker.stop();
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down worker...");
  await worker.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await worker.stop();
  process.exit(0);
});

main();
```

## Custom Queue per Event

Route specific events to dedicated queues:

```typescript
import { DomainEvent } from "@woltz/rich-domain";
import { QUEUES } from "../../constants";

export class NotificationRequestedEvent extends DomainEvent<{
  userId: string;
  message: string;
}> {
  // Static property to route to specific queue
  static queueName = QUEUES.NOTIFICATION_EVENTS;
}

export class WorkflowTriggeredEvent extends DomainEvent<{
  workflowId: string;
  trigger: string;
}> {
  static queueName = QUEUES.WORKFLOW_EVENTS;
}
```

## Queue Publisher (Direct Publishing)

For publishing to queues without going through aggregates:

```typescript
// infrastructure/queue/queue-publisher.ts
import { DomainEvent } from "@woltz/rich-domain";
import { Queue, JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { QUEUES } from "../../constants";

type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

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
      backoff: { type: "exponential", delay: 2000 },
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
```

## Dependency Injection Setup

```typescript
// infrastructure/di/container.ts
import { BullMQEventBus, connection } from "../queue";

export const eventBus = new BullMQEventBus(connection);

export const userService = new UserService(
  userRepository,
  eventBus // Inject event bus
);
```

## Event Flow Summary

```
1. Domain Action
   └─ user.addDomainEvent(new UserCreatedEvent({ email }))

2. Persistence
   └─ await userRepository.save(user)

3. Dispatch
   └─ await user.dispatchAll(eventBus)
       └─ BullMQEventBus.publish() → Redis Queue

4. Worker Process
   └─ BullMQDomainEventWorker.start()
       └─ Worker processes job
           └─ Handler executes (send email, etc.)
```

## Best Practices

1. **Dispatch after save** - Only dispatch events after successful persistence
2. **Idempotent handlers** - Handlers may run multiple times (retries)
3. **Separate worker process** - Run workers in dedicated process/container
4. **Queue per concern** - Use different queues for different concurrency needs
5. **Graceful shutdown** - Handle SIGINT/SIGTERM for clean worker shutdown
