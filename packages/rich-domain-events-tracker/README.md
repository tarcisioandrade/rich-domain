# @woltz/rich-domain-events-tracker

Event tracking system with pluggable adapters for monitoring domain events in real-time.

## Features

- 🔌 **Pluggable Adapters**: Support for any messaging system (BullMQ, RabbitMQ, Kafka, etc)
- 📊 **Real-time Tracking**: Monitor event states (pending, active, succeeded, failed, etc)
- 💾 **SQLite Storage**: Persistent event tracking with SQLite (default)
- 🔄 **Event Replay**: Re-enqueue failed events
- 📈 **Statistics**: Aggregate metrics, failure rates, processing times
- 🧹 **Retention Policies**: Automatic cleanup of old events
- 🎯 **Type-safe**: Full TypeScript support

## Installation

```bash
npm install @woltz/rich-domain-events-tracker
```

You'll also need an adapter for your messaging system:

```bash
npm install @woltz/rich-domain-bullmq-tracker  # For BullMQ
# or
npm install @woltz/rich-domain-rabbitmq-tracker  # For RabbitMQ (future)
```

## Quick Start

### 1. Setup with BullMQ

```typescript
import { EventTracker, TrackedEventBus } from '@woltz/rich-domain-events-tracker';
import { BullMQTrackerAdapter } from '@woltz/rich-domain-bullmq-tracker';
import { BullMQEventBus } from './infrastructure/queue/event-bus';
import IORedis from 'ioredis';

const redis = new IORedis();

// 1. Create adapter for your messaging system
const adapter = new BullMQTrackerAdapter(redis, ['main', 'notifications']);

// 2. Create tracker with the adapter
const tracker = new EventTracker({ adapter });
await tracker.initialize();

// 3. Create your normal event bus
const realBus = new BullMQEventBus(redis);

// 4. Wrap with tracking
const trackedBus = new TrackedEventBus({
  wrappedBus: realBus,
  tracker
});

// 5. Use normally - tracking is automatic!
await entity.dispatchAll(trackedBus);
```

### 2. Using Advanced Features

```typescript
// Replay a failed event
await tracker.replayEvent('event-id-123');

// Get statistics
const stats = await tracker.getStatistics();
console.log('Total events:', stats.total);
console.log('By state:', stats.byState);
console.log('Failure rate:', stats.failureRate);

// Query events with filters
const failedEvents = await tracker.queryEvents({
  state: 'failed',
  dateRange: {
    from: new Date('2025-01-01'),
    to: new Date()
  }
});

// Cleanup old events (retention policy)
const removed = await tracker.cleanupOldEvents(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
);
console.log(`Removed ${removed} old events`);
```

## Architecture

### Plugin-based Design

The tracker uses a plugin architecture where adapters implement the messaging-specific logic:

```
┌─────────────────────────────────────┐
│      TrackedEventBus                │
│  (wraps IDomainEventBus)            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      EventTracker                   │
│  (orchestrator)                     │
└──────┬────────────────────┬─────────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│  Adapter    │      │  Storage    │
│  (BullMQ,   │      │  (SQLite,   │
│  RabbitMQ)  │      │  Postgres)  │
└─────────────┘      └─────────────┘
```

### How It Works

1. **TrackedEventBus** intercepts `publish()` calls
2. **EventTracker** coordinates tracking via adapter
3. **Adapter** publishes to messaging system and monitors state changes
4. **Storage** persists events and their states in SQLite
5. **Callbacks** update storage when states change (real-time)

## API Reference

### EventTracker

Main orchestrator for event tracking.

```typescript
class EventTracker {
  constructor(config: EventTrackerConfig);

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;

  // Tracking
  trackEvent(event: IDomainEvent): Promise<void>;

  // Queries
  getEvent(eventId: string): Promise<TrackedEvent | null>;
  queryEvents(filters: EventFilters): Promise<TrackedEvent[]>;
  getPendingEvents(): Promise<TrackedEvent[]>;
  getStatistics(filters?: EventFilters): Promise<EventStatistics>;

  // Actions
  replayEvent(eventId: string): Promise<void>;
  cleanupOldEvents(olderThan: Date): Promise<number>;
}
```

### TrackedEventBus

Wrapper that adds tracking to any `IDomainEventBus`.

```typescript
class TrackedEventBus implements IDomainEventBus {
  constructor(config: TrackedEventBusConfig);

  publish(event: IDomainEvent): Promise<void>;
  publishAll(events: IDomainEvent[]): Promise<void>;
}
```

### ITrackerAdapter

Interface that messaging adapters must implement.

```typescript
interface ITrackerAdapter {
  onEventPublished(event: IDomainEvent): Promise<{
    jobId: string;
    queueName: string;
  }>;

  startMonitoring(callbacks: {
    onStateChange: (eventId: string, state: EventState, metadata?: EventMetadata) => Promise<void>;
  }): Promise<void>;

  stopMonitoring(): Promise<void>;
  getJobDetails(jobId: string): Promise<JobDetails | null>;
  replayEvent(event: IDomainEvent): Promise<void>;
}
```

### Event States

```typescript
type EventState =
  | 'pending'    // Awaiting processing (in queue)
  | 'active'     // Currently being processed
  | 'succeeded'  // Processed successfully
  | 'failed'     // Failed after all retries
  | 'delayed'    // Scheduled for future
  | 'retrying'   // Failed but will retry
  | 'unknown';   // Job not found
```

## Creating Custom Adapters

To support a new messaging system, implement `ITrackerAdapter`:

```typescript
import { ITrackerAdapter, EventState, EventMetadata } from '@woltz/rich-domain-events-tracker';
import type { IDomainEvent } from '@woltz/rich-domain';

export class MyCustomAdapter implements ITrackerAdapter {
  async onEventPublished(event: IDomainEvent) {
    // Publish to your messaging system
    const job = await this.messagingSystem.publish(event);

    return {
      jobId: job.id,
      queueName: job.queue
    };
  }

  async startMonitoring(callbacks) {
    // Listen to your messaging system's events
    this.messagingSystem.on('completed', async (job) => {
      await callbacks.onStateChange(
        job.data.eventId,
        'succeeded',
        { finishedAt: new Date() }
      );
    });

    this.messagingSystem.on('failed', async (job, error) => {
      await callbacks.onStateChange(
        job.data.eventId,
        'failed',
        { error: error.message }
      );
    });
  }

  async stopMonitoring() {
    await this.messagingSystem.disconnect();
  }

  async getJobDetails(jobId: string) {
    const job = await this.messagingSystem.getJob(jobId);
    return {
      jobId: job.id,
      state: this.mapState(job.state),
      metadata: { /* ... */ }
    };
  }

  async replayEvent(event: IDomainEvent) {
    await this.messagingSystem.publish(event);
  }
}
```

## Custom Storage

The default storage uses SQLite. To use a different database:

```typescript
import { IEventStorage } from '@woltz/rich-domain-events-tracker';

export class PostgresEventStorage implements IEventStorage {
  async initialize() { /* ... */ }
  async saveEvent(event: TrackedEvent) { /* ... */ }
  async updateEventState(eventId, state, metadata) { /* ... */ }
  async getEvent(eventId) { /* ... */ }
  async queryEvents(filters) { /* ... */ }
  async getPendingEvents() { /* ... */ }
  async getStatistics(filters) { /* ... */ }
  async cleanupOldEvents(olderThan) { /* ... */ }
  async close() { /* ... */ }
}

// Usage
const tracker = new EventTracker({
  adapter,
  storage: new PostgresEventStorage()
});
```

## Integration with Studio

The Rich Domain Studio can visualize tracked events:

```typescript
// Studio server reads from SQLite storage
import { EventTracker } from '@woltz/rich-domain-events-tracker';

const tracker = new EventTracker({ adapter });
await tracker.initialize();

// Query events for UI
const events = await tracker.queryEvents({
  state: ['failed', 'retrying'],
  limit: 100
});

// Get stats for dashboard
const stats = await tracker.getStatistics();
```

## Configuration Options

### EventTrackerConfig

```typescript
interface EventTrackerConfig {
  adapter: ITrackerAdapter;           // Required
  storage?: IEventStorage;            // Optional (default: SQLiteEventStorage)
  dbPath?: string;                    // Optional (default: './events.db')
  autoStartMonitoring?: boolean;      // Optional (default: true)
}
```

### TrackedEventBusConfig

```typescript
interface TrackedEventBusConfig {
  wrappedBus: IDomainEventBus;        // Required
  tracker: EventTracker;              // Required
  swallowTrackingErrors?: boolean;    // Optional (default: true)
}
```

If `swallowTrackingErrors` is true, tracking errors won't interrupt event publishing.

## Examples

### Example 1: Basic Setup

```typescript
import { EventTracker, TrackedEventBus } from '@woltz/rich-domain-events-tracker';
import { BullMQTrackerAdapter } from '@woltz/rich-domain-bullmq-tracker';

const adapter = new BullMQTrackerAdapter(redis, ['main']);
const tracker = new EventTracker({ adapter, dbPath: './my-events.db' });
await tracker.initialize();

const trackedBus = new TrackedEventBus({
  wrappedBus: myEventBus,
  tracker
});
```

### Example 2: Query Failed Events

```typescript
const failedEvents = await tracker.queryEvents({
  state: 'failed',
  eventName: 'UserCreatedEvent',
  dateRange: {
    from: new Date('2025-01-01'),
    to: new Date()
  }
});

for (const event of failedEvents) {
  console.log('Failed event:', event.eventId);
  console.log('Error:', event.metadata?.error);
  console.log('Attempts:', event.metadata?.attempts);
}
```

### Example 3: Automatic Cleanup

```typescript
// Run cleanup every day
setInterval(async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const removed = await tracker.cleanupOldEvents(thirtyDaysAgo);
  console.log(`Cleaned up ${removed} old events`);
}, 24 * 60 * 60 * 1000);
```

### Example 4: Statistics Dashboard

```typescript
const stats = await tracker.getStatistics({
  dateRange: {
    from: new Date('2025-01-01'),
    to: new Date()
  }
});

console.log(`
Total events: ${stats.total}
Succeeded: ${stats.byState.succeeded}
Failed: ${stats.byState.failed}
Failure rate: ${stats.failureRate?.toFixed(2)}%
Avg processing time: ${stats.avgProcessingTime}ms
`);
```

## Troubleshooting

### Events not being tracked

1. Ensure `tracker.initialize()` was called
2. Check that adapter is properly configured
3. Verify `TrackedEventBus` is being used (not the raw bus)

### Tracking errors

Enable verbose logging:

```typescript
const tracker = new EventTracker({
  adapter,
  dbPath: './events.db'
});

// Errors will be logged to console
```

### Performance issues

- Use batch cleanup instead of frequent small cleanups
- Consider moving to PostgreSQL for large volumes
- Adjust SQLite WAL mode settings

## License

MIT

## Related Packages

- [@woltz/rich-domain](../rich-domain) - Core DDD library
- [@woltz/rich-domain-bullmq-tracker](../rich-domain-bullmq-tracker) - BullMQ adapter
- [@woltz/rich-domain-cli](../rich-domain-cli) - Studio for visualization
