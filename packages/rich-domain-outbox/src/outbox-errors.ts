import { DomainError } from "@woltz/rich-domain";

/**
 * Base error class for all outbox-related errors.
 */
export class OutboxError extends DomainError {
  constructor(message: string, code?: string) {
    super(message, code ?? "OUTBOX_ERROR");
  }
}

/**
 * Thrown when an individual event cannot be published via the event bus.
 */
export class OutboxPublishError extends OutboxError {
  /** The event ID that failed to publish. */
  public readonly eventId: string;

  constructor(eventId: string, message: string) {
    super(
      `Failed to publish event ${eventId}: ${message}`,
      "OUTBOX_PUBLISH_ERROR"
    );
    this.eventId = eventId;
  }
}

/**
 * Thrown when the outbox store cannot persist or query events.
 */
export class OutboxStoreError extends OutboxError {
  constructor(message: string) {
    super(message, "OUTBOX_STORE_ERROR");
  }
}
