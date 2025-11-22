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
