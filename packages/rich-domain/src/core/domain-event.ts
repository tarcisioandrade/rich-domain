import type { IDomainEvent } from "../types/domain-event.js";
import UUID from "../utils/crypto.js";

/**
 * Base class for domain events
 */
export abstract class DomainEvent<P> implements IDomainEvent<P> {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly payload: P;
  static readonly queueName?: string;

  constructor(payload: P) {
    this.eventId = this.generateEventId();
    this.occurredOn = new Date();
    this.payload = payload;
  }

  /**
   * Get the event name (defaults to class name)
   */
  get eventName(): string {
    return this.constructor.name;
  }

  /**
   * Generate a UUID v4
   */
  private generateEventId(): string {
    return UUID();
  }

  toJSON() {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      occurredOn: this.occurredOn.toISOString(),
      payload: this.payload,
    };
  }
}
