import { OutboxEntryData, OutboxStatus } from "@woltz/rich-domain";

/**
 * Immutable value container representing a single row in the outbox table.
 */
export class OutboxEntry {
  readonly id: string;
  readonly eventName: string;
  readonly payload: unknown;
  readonly occurredOn: Date;
  readonly status: OutboxStatus;
  readonly retries: number;
  readonly lastError: string | null;
  readonly createdAt: Date;

  constructor(props: OutboxEntryData) {
    this.id = props.id;
    this.eventName = props.eventName;
    this.payload = props.payload;
    this.occurredOn = props.occurredOn;
    this.status = props.status;
    this.retries = props.retries;
    this.lastError = props.lastError;
    this.createdAt = props.createdAt;
    Object.freeze(this);
  }

  /**
   * Returns `true` if this entry has not yet reached the retry limit
   * and can still be retried.
   */
  canRetry(maxRetries: number): boolean {
    return this.retries < maxRetries;
  }

  /**
   * Returns `true` if the status is `"published"`.
   */
  get isPublished(): boolean {
    return this.status === "published";
  }

  /**
   * Returns `true` if the status is `"pending"`.
   */
  get isPending(): boolean {
    return this.status === "pending";
  }

  /**
   * Returns `true` if the status is `"failed"`.
   */
  get isFailed(): boolean {
    return this.status === "failed";
  }

  /**
   * Serialize to a plain JSON-compatible object.
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      eventName: this.eventName,
      payload: this.payload,
      occurredOn: this.occurredOn.toISOString(),
      status: this.status,
      retries: this.retries,
      lastError: this.lastError,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
