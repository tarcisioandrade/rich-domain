import type { IDomainEvent } from "./domain-event.js";

export interface IDomainEventBus {
  /**
   * Publish a single domain event.
   *
   * @param event - The domain event to publish
   */
  publish(event: IDomainEvent): Promise<void>;

  /**
   * Publish multiple domain events.
   *
   * @param events - Array of domain events to publish
   */
  publishAll(events: IDomainEvent[]): Promise<void>;
}
