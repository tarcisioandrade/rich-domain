import {
  IDomainEvent,
  IDomainEventBus,
  IOutboxStore,
  OutboxEntryData,
} from "@woltz/rich-domain";

/**
 * Configuration options for {@link OutboxPublisher}.
 */
export interface OutboxPublisherConfig {
  /**
   * Milliseconds between polling cycles.
   * @default 5000 (5 seconds)
   */
  pollIntervalMs?: number;

  /**
   * Maximum number of events to fetch and publish per batch.
   * @default 50
   */
  batchSize?: number;

  /**
   * Maximum publish attempts before an entry is permanently marked as `"failed"`.
   * @default 3
   */
  maxRetries?: number;

  /**
   * Logger instance. Pass `console` or any object with `info`, `warn`, `error` methods.
   * Set to `{ info, warn, error: () => {} }` to suppress error logs in tests.
   * @default console
   */
  logger?: Pick<typeof console, "info" | "warn" | "error">;
}

/**
 * Background process that polls the outbox store and publishes pending events.
 *
 * The publisher is a **safety net**, not the primary delivery mechanism.
 * Events are normally published immediately by {@link OutboxEventBusDecorator}
 * during `dispatchAll()`. The publisher only handles events that failed due to
 * transient errors (broker restart, network blip, etc.).
 *
 * @example
 * ```typescript
 * const publisher = new OutboxPublisher(outboxStore, eventBus, {
 *   pollIntervalMs: 5000,
 *   batchSize: 50,
 *   maxRetries: 3,
 * });
 *
 * publisher.start();
 *
 * // Graceful shutdown
 * process.on("SIGTERM", async () => {
 *   await publisher.stop();
 * });
 * ```
 */
export class OutboxPublisher {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private readonly config: Required<OutboxPublisherConfig>;

  constructor(
    private readonly outboxStore: IOutboxStore,
    private readonly eventBus: IDomainEventBus,
    config: OutboxPublisherConfig = {}
  ) {
    this.config = {
      pollIntervalMs: config.pollIntervalMs ?? 5000,
      batchSize: config.batchSize ?? 50,
      maxRetries: config.maxRetries ?? 3,
      logger: config.logger ?? console,
    };
  }

  /**
   * Start the polling loop. This is idempotent — calling `start()` when
   * already running is a no-op.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.config.logger.info("[OutboxPublisher] Started polling");
    this.scheduleNext();
  }

  /**
   * Stop the polling loop. Returns a promise that resolves immediately.
   * Any in-flight batch will complete, but no new batch will be scheduled.
   */
  async stop(): Promise<void> {
    this.running = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.config.logger.info("[OutboxPublisher] Stopped");
  }

  /**
   * Process a single batch immediately. Useful for manual triggering
   * (e.g., from a CLI command or an admin endpoint).
   *
   * @returns The number of events processed in this batch.
   */
  async processOnce(): Promise<number> {
    try {
      const { entries } = await this.outboxStore.fetchPending(
        this.config.batchSize
      );

      if (entries.length === 0) return 0;

      // Reconstruct minimal IDomainEvent objects from outbox rows.
      // We only need the interface shape — the event bus doesn't require
      // the full domain event class instance.
      const events: IDomainEvent[] = entries.map(toDomainEvent);

      try {
        await this.eventBus.publishAll(events);
        await Promise.all(
          entries.map((e) => this.outboxStore.markPublished(e.id))
        );
        this.config.logger.info(
          `[OutboxPublisher] Published ${entries.length} events`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Mark only entries that haven't exceeded maxRetries as failed.
        // Entries at maxRetries stay "failed" — they need manual intervention.
        const toMark = entries.filter(
          (e) => e.status !== "failed" || e.retries < this.config.maxRetries
        );
        await Promise.all(
          toMark.map((e) => this.outboxStore.markFailed(e.id, message))
        );
        this.config.logger.error(
          `[OutboxPublisher] Batch publish failed: ${message}`
        );
      }

      return entries.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.config.logger.error(`[OutboxPublisher] Polling error: ${message}`);
      return 0;
    }
  }

  /**
   * Returns whether the publisher is currently running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      await this.processOnce();
      this.scheduleNext();
    }, this.config.pollIntervalMs);
    // Allow Node.js to exit if this is the only active timer
    if (this.timer && typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }
}

/**
 * Reconstruct a minimal `IDomainEvent` from an outbox row.
 * No deserialization registry needed — the event bus only needs the interface shape.
 */
function toDomainEvent(entry: OutboxEntryData): IDomainEvent {
  return {
    eventId: entry.id,
    eventName: entry.eventName,
    occurredOn: entry.occurredOn,
    payload: entry.payload,
  };
}
