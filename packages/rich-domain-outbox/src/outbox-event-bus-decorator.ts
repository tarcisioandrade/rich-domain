import {
  IDomainEvent,
  IDomainEventBus,
  IOutboxStore,
} from "@woltz/rich-domain";

/**
 * Wraps an {@link IDomainEventBus} and adds transactional outbox safety.
 *
 * On **successful** publish, marks the corresponding outbox entry as `"published"`.
 * On **failure**, marks the entry as `"failed"` (so the {@link OutboxPublisher} can retry later).
 *
 * This is a decorator in the *Decorator Pattern* sense — not a TypeScript `@Decorator`.
 * It implements the same `IDomainEventBus` interface, so it can be used anywhere
 * an `IDomainEventBus` is expected.
 *
 * @example
 * ```typescript
 * const bus = new OutboxEventBusDecorator(rabbitEventBus, prismaOutboxStore);
 * // Use it exactly like your original event bus:
 * await aggregate.dispatchAll(bus);
 * ```
 *
 * ## How eventId mapping works
 *
 * Each `IDomainEvent` has a unique `eventId`. When events are saved to the
 * outbox table, `event.eventId` becomes the **primary key** (`id` column).
 *
 * - `markPublished(event.eventId)` → `UPDATE outbox SET status = 'published' WHERE id = :eventId`
 * - `markFailed(event.eventId, error)` → `UPDATE outbox SET status = 'failed', ... WHERE id = :eventId`
 *
 * No JSON search inside the payload — just an indexed primary key lookup.
 */
export class OutboxEventBusDecorator implements IDomainEventBus {
  constructor(
    private readonly inner: IDomainEventBus,
    private readonly outboxStore: IOutboxStore
  ) {}

  /**
   * Publish a single domain event.
   * On success: marks the outbox entry as published.
   * On failure: marks the outbox entry as failed.
   */
  async publish(event: IDomainEvent): Promise<void> {
    try {
      await this.inner.publish(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.outboxStore.markFailed(event.eventId, message);
      throw error;
    }
    await this.outboxStore.markPublished(event.eventId);
  }

  /**
   * Publish multiple domain events.
   * On success: marks all outbox entries as published.
   * On failure: marks all entries as failed.
   */
  async publishAll(events: IDomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      await this.inner.publishAll(events);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await Promise.all(
        events.map((e) => this.outboxStore.markFailed(e.eventId, message))
      );
      throw error;
    }

    await Promise.all(
      events.map((e) => this.outboxStore.markPublished(e.eventId))
    );
  }
}
