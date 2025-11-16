// ============================================================================
// Domain Events - Event-Driven Architecture Support
// ============================================================================

import { Id } from "./id";

/**
 * Interface for all domain events
 */
export interface IDomainEvent {
  /**
   * Unique identifier for this event occurrence
   */
  readonly eventId: string;

  /**
   * When the event occurred
   */
  readonly occurredOn: Date;

  /**
   * Name/type of the event (e.g., "UserCreated", "OrderPlaced")
   */
  readonly eventName: string;

  /**
   * ID of the aggregate that raised this event
   */
  readonly aggregateId: string;
}

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
    this.aggregateId = aggregateId instanceof Id ? aggregateId.value : aggregateId;
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

/**
 * Event handler function type
 */
export type DomainEventHandler<T extends IDomainEvent = IDomainEvent> = (
  event: T
) => void | Promise<void>;

/**
 * Event handler class type
 */
export interface IDomainEventHandler<T extends IDomainEvent = IDomainEvent> {
  handle(event: T): void | Promise<void>;
}
