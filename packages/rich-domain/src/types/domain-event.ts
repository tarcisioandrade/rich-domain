/**
 * Interface for all domain events
 */
export interface IDomainEvent<P = unknown> {
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
   * Queue name for the event (optional)
   */
  readonly queueName?: string;

  /**
   * Payload of the event
   */
  readonly payload: P;
}
