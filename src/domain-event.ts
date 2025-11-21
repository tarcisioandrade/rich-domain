// ============================================================================
// Domain Events - Event-Driven Architecture Support
// ============================================================================

import { IDomainEvent } from ".";
import { Id } from "./id";

/**
 * Base class for domain events
 */
export abstract class DomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;

  constructor(aggregateId: Id | string) {
    this.eventId = this.generateEventId();
    this.occurredOn = new Date();
    this.aggregateId =
      aggregateId instanceof Id ? aggregateId.value : aggregateId;
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

  /**
   * Convert event to JSON
   */
  toJSON(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      occurredOn: this.occurredOn.toISOString(),
      aggregateId: this.aggregateId,
      ...this.getPayload(),
    };
  }

  /**
   * Override this to provide event-specific data
   */
  protected getPayload(): Record<string, any> {
    return {};
  }
}
