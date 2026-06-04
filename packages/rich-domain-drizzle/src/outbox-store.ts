import { asc, eq, inArray, sql } from "drizzle-orm";
import {
  IDomainEvent,
  IOutboxStore,
  OutboxFetchResult,
} from "@woltz/rich-domain";
import { type DrizzleClient, UOWStorage } from "./unit-of-work";
import { OutboxStoreError } from "./errors";
import { outboxTable } from "./outbox-table";

/**
 * Drizzle implementation of {@link IOutboxStore}.
 *
 * When called inside a {@link DrizzleUnitOfWork} transaction, operations use
 * the same transactional client, guaranteeing that outbox rows are written
 * atomically with the aggregate.
 *
 * When called outside a transaction, falls back to the raw Drizzle client.
 *
 * **Important:** the outbox store relies on `UOWStorage` (the `AsyncLocalStorage`
 * singleton from `rich-domain-drizzle`) to resolve the transactional client.
 *
 * @example
 * ```typescript
 * const outboxStore = new DrizzleOutboxStore(db);
 * const bus = new OutboxEventBusDecorator(rabbitBus, outboxStore);
 * ```
 */
export class DrizzleOutboxStore implements IOutboxStore {
  constructor(private readonly db: DrizzleClient) {}

  /**
   * Get the current Drizzle client — transactional if inside a UoW transaction,
   * otherwise the raw client.
   */
  private get context(): DrizzleClient {
    const ctx = UOWStorage.getStore()?.ctx;
    return ctx?.client ?? this.db;
  }

  async save(events: IDomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      await this.context.insert(outboxTable).values(
        events.map((e) => ({
          id: e.eventId,
          eventName: e.eventName,
          payload: e.payload,
          occurredOn: e.occurredOn,
          status: "pending" as const,
          retries: 0,
          lastError: null,
        }))
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new OutboxStoreError(`Failed to save outbox entries: ${message}`);
    }
  }

  async fetchPending(batchSize = 50): Promise<OutboxFetchResult> {
    const rows = await this.context
      .select()
      .from(outboxTable)
      .where(inArray(outboxTable.status, ["pending"]))
      .orderBy(asc(outboxTable.createdAt))
      .limit(batchSize);

    return {
      entries: rows.map((r: typeof outboxTable.$inferSelect) => ({
        id: r.id,
        eventName: r.eventName,
        payload: r.payload,
        occurredOn: r.occurredOn,
        status: r.status as "pending" | "published" | "failed",
        retries: r.retries,
        lastError: r.lastError,
        createdAt: r.createdAt,
      })),
    };
  }

  async markPublished(id: string): Promise<void> {
    await this.context
      .update(outboxTable)
      .set({ status: "published" })
      .where(eq(outboxTable.id, id));
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.context
      .update(outboxTable)
      .set({
        status: "failed",
        retries: sql`${outboxTable.retries} + 1`,
        lastError: error,
      })
      .where(eq(outboxTable.id, id));
  }
}
