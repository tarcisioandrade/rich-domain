# Transactional Outbox

Guaranteed domain event delivery with the Transactional Outbox pattern (`@woltz/rich-domain-outbox`).

**Docs:** [Transactional Outbox](https://woltz.mintlify.app/integrations/outbox)

## When to Use

Use the outbox when domain events must survive process crashes, deployments, or broker outages between `save()` and `dispatchAll()`. The outbox is a **safety net** — events still publish immediately when the broker is healthy.

## Packages

| Package                      | Purpose                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `@woltz/rich-domain`         | `IOutboxStore`, `OutboxEntryData`, `OutboxStatus`                         |
| `@woltz/rich-domain-outbox`  | `OutboxEventBusDecorator`, `OutboxPublisher`, `OutboxEntry`, `OUTBOX_DDL` |
| `@woltz/rich-domain-prisma`  | `PrismaOutboxStore`, `PRISMA_OUTBOX_SCHEMA`                               |
| `@woltz/rich-domain-drizzle` | `DrizzleOutboxStore`, `outboxTable`                                       |
| `@woltz/rich-domain-typeorm` | `TypeORMOutboxStore`, `OutboxEntity`                                      |

## Outbox Table Schema

| Column       | Description                             |
| ------------ | --------------------------------------- |
| `id`         | PRIMARY KEY — stores `event.eventId`    |
| `eventName`  | Event class name (e.g. `"OrderPlaced"`) |
| `payload`    | JSON payload                            |
| `occurredOn` | When the event was created              |
| `status`     | `pending` → `published` or `failed`     |
| `retries`    | Publish attempt count (default `0`)     |
| `lastError`  | Last failure message                    |
| `createdAt`  | Row insert time                         |

Index `status` for polling queries.

## Setup (5 steps)

### 1. Install

```bash
npm install @woltz/rich-domain-outbox
```

### 2. Create table (pick ORM)

**Prisma** — add to `schema.prisma` (or use `PRISMA_OUTBOX_SCHEMA` from `@woltz/rich-domain-prisma`):

```prisma
model Outbox {
  id          String   @id
  eventName   String
  payload     Json
  occurredOn  DateTime
  status      String   @default("pending")
  retries     Int      @default(0)
  lastError   String?
  createdAt   DateTime @default(now())

  @@index([status])
}
```

**Drizzle** — `import { outboxTable } from "@woltz/rich-domain-drizzle"` and add to schema.

**TypeORM** — register `OutboxEntity` from `@woltz/rich-domain-typeorm` in DataSource `entities`.

**Raw SQL** — `OUTBOX_DDL.postgresql` / `OUTBOX_DDL.mysql` from `@woltz/rich-domain-outbox`.

### 3. Wire repository `outboxStore`

Events are auto-saved on `save()` when `outboxStore` is configured (same DB transaction as the aggregate).

**Prisma** — 5th constructor argument:

```typescript
import { PrismaOutboxStore } from "@woltz/rich-domain-prisma";

const outboxStore = new PrismaOutboxStore(prisma);

super(mapper, toDomain, prisma, uow, outboxStore);
```

**Drizzle** — `DrizzleRepositoryConfig.outboxStore`:

```typescript
import { DrizzleOutboxStore } from "@woltz/rich-domain-drizzle";

super({
  db,
  table,
  toDomainMapper,
  toPersistenceMapper,
  uow,
  outboxStore: new DrizzleOutboxStore(db),
});
```

**TypeORM** — `TypeORMRepositoryConfig.outboxStore`:

```typescript
import { TypeORMOutboxStore } from "@woltz/rich-domain-typeorm";

super({
  typeormRepository,
  toDomainMapper,
  toPersistenceMapper,
  uow,
  outboxStore: new TypeORMOutboxStore(dataSource),
});
```

See adapter references: [Prisma](./prisma-adapter.md), [Drizzle](./drizzle-adapter.md), [TypeORM](./typeorm-adapter.md).

### 4. Wrap event bus + start publisher

```typescript
import {
  OutboxEventBusDecorator,
  OutboxPublisher,
} from "@woltz/rich-domain-outbox";

const realBus = new BullMQEventBus(connection);
const bus = new OutboxEventBusDecorator(realBus, outboxStore);

const publisher = new OutboxPublisher(outboxStore, realBus, {
  pollIntervalMs: 5000,
  batchSize: 50,
  maxRetries: 3,
});
publisher.start();

process.on("SIGTERM", async () => {
  await publisher.stop();
});
```

### 5. Use case (unchanged)

```typescript
await repo.save(order); // Events → outbox (same tx)
await order.dispatchAll(bus); // Immediate publish; decorator marks published/failed
```

## How It Works

1. **`save()`** — Repository extracts uncommitted events and calls `outboxStore.save(events)` inside the UoW transaction.
2. **`dispatchAll(bus)`** — `OutboxEventBusDecorator` publishes to the real bus; on success `markPublished(eventId)`, on failure `markFailed(eventId, error)`.
3. **`OutboxPublisher`** — Polls `fetchPending()`, retries failed/pending events, marks results.

## IOutboxStore Contract

```typescript
interface IOutboxStore {
  save(events: IDomainEvent[], tx?: unknown): Promise<void>;
  fetchPending(batchSize?: number): Promise<OutboxFetchResult>;
  markPublished(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}
```

## Monitoring

```sql
SELECT COUNT(*) FROM outbox WHERE status = 'failed' AND retries >= 3;
SELECT COUNT(*) FROM outbox WHERE status = 'pending' AND "createdAt" < NOW() - INTERVAL '1 hour';
```

Alert when counts exceed thresholds.

## Common Mistakes

1. **Skipping `outboxStore` on repository** — Events only publish if `dispatchAll()` runs; no safety net without it.
2. **Outbox table outside migration** — Store will fail at runtime on first `save()`.
3. **Forgetting `OutboxPublisher.start()`** — Pending events never retry after broker recovery.
4. **Treating outbox as primary path** — Keep immediate `dispatchAll()`; publisher is backup only.

## Related

- [Domain Events](./domain-events.md) — Defining and dispatching events (BullMQ example)
- [Prisma Adapter](./prisma-adapter.md#transactional-outbox)
- [Drizzle Adapter](./drizzle-adapter.md#transactional-outbox)
- [TypeORM Adapter](./typeorm-adapter.md#transactional-outbox)
