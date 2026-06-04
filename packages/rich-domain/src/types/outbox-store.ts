import { IDomainEvent } from "./domain-event.js";

/**
 * Possible statuses for an outbox entry.
 *
 * - `pending`: The event has been persisted but not yet published.
 * - `published`: The event has been successfully published to the message broker.
 * - `failed`: The event failed to publish after the maximum number of retries.
 */
export type OutboxStatus = "pending" | "published" | "failed";

/**
 * The data shape of a single outbox entry returned by {@link IOutboxStore.fetchPending}.
 * This is the flat wire format — no class logic, just data.
 */
export interface OutboxEntryData {
  /** The event's own `eventId`, used as the primary key of the outbox table. */
  id: string;
  /** The event class name (e.g. `"OrderPlaced"`). */
  eventName: string;
  /** The event payload (the `P` generic from `DomainEvent<P>`). */
  payload: unknown;
  /** When the domain event was originally created. */
  occurredOn: Date;
  /** Current publish status. */
  status: OutboxStatus;
  /** Number of publish attempts so far. */
  retries: number;
  /** Error message from the most recent failed publish attempt, if any. */
  lastError: string | null;
  /** When this outbox row was inserted. */
  createdAt: Date;
}

/**
 * Result returned by {@link IOutboxStore.fetchPending}.
 */
export interface OutboxFetchResult {
  entries: OutboxEntryData[];
}

/**
 * Minimal, framework-agnostic contract for an outbox persistence store.
 *
 * Implementations exist for Prisma, Drizzle, TypeORM, and raw SQL.
 * The interface lives in `@woltz/rich-domain` (core) so that the
 * `@woltz/rich-domain-outbox` package can depend on it without
 * coupling to any specific ORM or database.
 */
export interface IOutboxStore {
  /**
   * Persist one or more domain events to the outbox table.
   *
   * MUST be called within the same database transaction as the aggregate write
   * so that both succeed or both roll back together.
   *
   * Each event's `eventId` becomes the primary key (`id`) of the outbox row.
   * The `status` column is always set to `"pending"` initially.
   *
   * @param events  - The domain events to persist.
   * @param tx      - Optional ORM-specific transaction context (e.g. a Prisma interactive tx client, a Drizzle tx, or a TypeORM EntityManager).
   */
  save(events: IDomainEvent[], tx?: unknown): Promise<void>;

  /**
   * Fetch a batch of events whose status is still `"pending"`.
   * Entries are returned in insertion order (oldest first) so that
   * earlier events are retried before later ones.
   *
   * The publisher calls this periodically and attempts to publish each entry.
   * On success it calls {@link markPublished}; on failure it calls {@link markFailed}.
   *
   * @param batchSize - Maximum number of entries to return. Default 50.
   * @returns A result object containing the matching entries.
   */
  fetchPending(batchSize?: number): Promise<OutboxFetchResult>;

  /**
   * Mark an outbox entry as successfully published.
   *
   * Mapping: `UPDATE outbox SET status = 'published' WHERE id = :eventId`
   *
   * @param id - The event's `eventId` (same value used as the outbox primary key).
   */
  markPublished(id: string): Promise<void>;

  /**
   * Mark an outbox entry as failed, incrementing its retry counter
   * and recording the error that caused the failure.
   *
   * Mapping: `UPDATE outbox SET status = 'failed', retries = retries + 1, lastError = :error WHERE id = :eventId`
   *
   * @param id    - The event's `eventId`.
   * @param error - The error message.
   */
  markFailed(id: string, error: string): Promise<void>;
}
