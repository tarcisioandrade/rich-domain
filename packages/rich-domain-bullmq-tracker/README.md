# @woltz/rich-domain-bullmq-tracker

BullMQ adapter for [@woltz/rich-domain-events-tracker](../rich-domain-events-tracker).

Provides real-time event tracking using BullMQ's queue events system.

## Features

- 🔴 **Real-time Monitoring**: Uses BullMQ `QueueEvents` for instant state updates
- 📊 **Complete State Tracking**: Tracks waiting, active, completed, failed, delayed, retrying
- 🔄 **Event Replay**: Re-enqueue failed events
- 🎯 **Multiple Queues**: Monitor events across different BullMQ queues
- ⚡ **High Performance**: Efficient event-driven architecture
- 🛡️ **Type-safe**: Full TypeScript support

## Installation

```bash
npm install @woltz/rich-domain-bullmq-tracker @woltz/rich-domain-events-tracker bullmq ioredis
```

## Quick Start

```typescript
import { EventTracker, TrackedEventBus } from '@woltz/rich-domain-events-tracker';
import { BullMQTrackerAdapter } from '@woltz/rich-domain-bullmq-tracker';
import { BullMQEventBus } from './infrastructure/queue/event-bus';

// 1. Create BullMQ adapter
const adapter = new BullMQTrackerAdapter({
  connection: 'redis://localhost:6379',
  queueNames: ['main', 'notifications', 'emails']
});

// 2. Create tracker with adapter
const tracker = new EventTracker({ adapter });
await tracker.initialize();

// 3. Wrap your event bus
const realBus = new BullMQEventBus(redis);
const trackedBus = new TrackedEventBus({
  wrappedBus: realBus,
  tracker
});

// 4. Use normally - tracking is automatic!
await entity.dispatchAll(trackedBus);
```

## Configuration

### BullMQTrackerAdapterConfig

```typescript
interface BullMQTrackerAdapterConfig {
  /**
   * Redis connection string or IORedis options
   */
  connection: RedisOptions | string;

  /**
   * List of queue names to monitor
   * Default: ['default']
   */
  queueNames?: string[];

  /**
   * Default queue for events without specific queue
   * Default: 'default'
   */
  defaultQueueName?: string;

  /**
   * Additional BullMQ queue options
   */
  queueOptions?: {
    /**
     * Redis key prefix
     */
    prefix?: string;

    /**
     * Default job options
     */
    defaultJobOptions?: {
      attempts?: number;
      backoff?: {
        type: string;
        delay: number;
      };
      removeOnComplete?: boolean | number;
      removeOnFail?: boolean | number;
    };
  };
}
```

## Usage Examples

### Example 1: Basic Setup

```typescript
import { BullMQTrackerAdapter } from '@woltz/rich-domain-bullmq-tracker';

const adapter = new BullMQTrackerAdapter({
  connection: {
    host: 'localhost',
    port: 6379,
    password: 'your-password'
  },
  queueNames: ['default']
});
```

### Example 2: Multiple Queues

```typescript
const adapter = new BullMQTrackerAdapter({
  connection: 'redis://localhost:6379',
  queueNames: ['main', 'notifications', 'emails', 'analytics'],
  defaultQueueName: 'main'
});
```

### Example 3: Custom Job Options

```typescript
const adapter = new BullMQTrackerAdapter({
  connection: 'redis://localhost:6379',
  queueNames: ['main'],
  queueOptions: {
    prefix: 'myapp',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,  // Keep last 100 completed
      removeOnFail: false     // Keep all failed for debugging
    }
  }
});
```

### Example 4: Queue-Specific Events

You can route events to specific queues using the static `queueName` property:

```typescript
import { DomainEvent } from '@woltz/rich-domain';

export class UserCreatedEvent extends DomainEvent<{ email: string }> {
  static queueName = 'main';
}

export class SendEmailEvent extends DomainEvent<{ to: string; subject: string }> {
  static queueName = 'emails';
}

// Events will be automatically routed to their respective queues
await trackedBus.publish(new UserCreatedEvent({ email: 'user@example.com' }));
await trackedBus.publish(new SendEmailEvent({ to: 'user@example.com', subject: 'Welcome!' }));
```

### Example 5: Complete Integration

```typescript
import { EventTracker, TrackedEventBus } from '@woltz/rich-domain-events-tracker';
import { BullMQTrackerAdapter } from '@woltz/rich-domain-bullmq-tracker';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const redis = new IORedis('redis://localhost:6379');

// Setup tracking
const adapter = new BullMQTrackerAdapter({
  connection: redis,
  queueNames: ['main'],
  queueOptions: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  }
});

const tracker = new EventTracker({
  adapter,
  dbPath: './events.db'
});

await tracker.initialize();

// Setup event bus
const queue = new Queue('main', { connection: redis });

const trackedBus = new TrackedEventBus({
  wrappedBus: {
    publish: async (event) => {
      await queue.add(event.eventName, event);
    },
    publishAll: async (events) => {
      await queue.addBulk(events.map(e => ({
        name: e.eventName,
        data: e
      })));
    }
  },
  tracker
});

// Setup worker
const worker = new Worker('main', async (job) => {
  console.log('Processing:', job.data.eventName);
  // Process event...
}, { connection: redis });

// Use the tracked bus
await entity.dispatchAll(trackedBus);

// Query tracked events
const failedEvents = await tracker.queryEvents({ state: 'failed' });
console.log('Failed events:', failedEvents);

// Replay failed events
for (const event of failedEvents) {
  await tracker.replayEvent(event.eventId);
}

// Cleanup
await worker.close();
await tracker.shutdown();
```

## State Mapping

BullMQ states are mapped to tracker states as follows:

| BullMQ State | Tracker State | Description |
|--------------|---------------|-------------|
| `waiting` | `pending` | Job is in queue waiting to be processed |
| `waiting-children` | `pending` | Job is waiting for child jobs |
| `delayed` | `delayed` | Job is scheduled for future |
| `active` | `active` | Job is currently being processed |
| `completed` | `succeeded` | Job completed successfully |
| `failed` | `failed` or `retrying` | Job failed (retrying if attempts remain) |
| `paused` | `pending` | Queue is paused |

## Events Tracked

The adapter monitors these BullMQ queue events:

- **waiting**: Job added to queue
- **active**: Job processing started
- **completed**: Job finished successfully
- **failed**: Job failed (with retry info)
- **delayed**: Job scheduled for later
- **retries-exhausted**: All retry attempts failed

## API Reference

### BullMQTrackerAdapter

Implements `ITrackerAdapter` from `@woltz/rich-domain-events-tracker`.

```typescript
class BullMQTrackerAdapter implements ITrackerAdapter {
  constructor(config: BullMQTrackerAdapterConfig);

  // ITrackerAdapter methods
  onEventPublished(event: IDomainEvent): Promise<{ jobId: string; queueName: string }>;
  startMonitoring(callbacks): Promise<void>;
  stopMonitoring(): Promise<void>;
  getJobDetails(jobId: string): Promise<JobDetails | null>;
  replayEvent(event: IDomainEvent): Promise<void>;
}
```

## Advanced Usage

### Custom Event Routing

```typescript
// In your domain event class
export class CriticalEvent extends DomainEvent<{ reason: string }> {
  static queueName = 'critical';  // Routes to 'critical' queue
}

// Configure adapter to monitor it
const adapter = new BullMQTrackerAdapter({
  connection: redis,
  queueNames: ['default', 'critical'],
  defaultQueueName: 'default'
});
```

### Monitoring Specific Job Details

```typescript
const jobDetails = await tracker.adapterInstance.getJobDetails('job-123');

if (jobDetails) {
  console.log('Job state:', jobDetails.state);
  console.log('Attempts:', jobDetails.metadata.attempts);
  console.log('Error:', jobDetails.metadata.error);
  console.log('Processing time:',
    jobDetails.metadata.finishedAt.getTime() -
    jobDetails.metadata.processedAt.getTime()
  );
}
```

### Error Handling

```typescript
const adapter = new BullMQTrackerAdapter({
  connection: redis,
  queueNames: ['main']
});

try {
  await adapter.startMonitoring({
    onStateChange: async (eventId, state, metadata) => {
      console.log(`Event ${eventId} -> ${state}`);

      if (state === 'failed') {
        console.error('Event failed:', metadata.error);
        // Send alert, log to monitoring service, etc
      }
    }
  });
} catch (error) {
  console.error('Failed to start monitoring:', error);
}
```

## Troubleshooting

### Events not being tracked

1. Ensure Redis is running and accessible
2. Verify queue names match between adapter and workers
3. Check that `tracker.initialize()` was called
4. Verify events implement `IDomainEvent` interface

### Missing state updates

1. Check that all queues are listed in `queueNames`
2. Ensure workers are running
3. Verify Redis connection is stable
4. Check BullMQ queue event listeners are active

### Performance issues

1. Limit number of completed jobs: `removeOnComplete: 100`
2. Use Redis prefix to avoid key conflicts: `prefix: 'myapp'`
3. Consider using separate Redis instance for tracking
4. Monitor Redis memory usage

## Integration with Studio

The tracker data can be visualized in Rich Domain Studio:

```typescript
// Studio server reads tracked events
import { EventTracker } from '@woltz/rich-domain-events-tracker';
import { BullMQTrackerAdapter } from '@woltz/rich-domain-bullmq-tracker';

const adapter = new BullMQTrackerAdapter({
  connection: process.env.REDIS_URL!,
  queueNames: ['main', 'notifications']
});

const tracker = new EventTracker({ adapter });
await tracker.initialize();

// Expose via API
app.get('/api/events', async (req, res) => {
  const events = await tracker.queryEvents({
    state: req.query.state,
    limit: 100
  });
  res.json(events);
});

app.get('/api/events/stats', async (req, res) => {
  const stats = await tracker.getStatistics();
  res.json(stats);
});
```

## Requirements

- **Node.js**: >= 18.0.0
- **BullMQ**: >= 5.0.0
- **IORedis**: >= 5.0.0
- **Redis**: >= 6.0.0

## License

MIT

## Related Packages

- [@woltz/rich-domain](../rich-domain) - Core DDD library
- [@woltz/rich-domain-events-tracker](../rich-domain-events-tracker) - Event tracking core
- [@woltz/rich-domain-cli](../rich-domain-cli) - Studio for visualization
