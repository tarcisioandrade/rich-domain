import { IDomainEvent } from ".";

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

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
