import { BaseEntity } from "./base-entity.js";
import { BaseProps, IDomainEvent, IDomainEventBus } from "../types/index.js";

/**
 * Base class for Aggregates that adds domain event management capabilities.
 * In Domain-Driven Design (DDD), only Aggregates (aggregate roots) should emit domain events.
 * Regular Entities and Value Objects should NOT manage domain events.
 */
export abstract class BaseAggregate<
  T extends BaseProps,
  TOptionalInput extends keyof T = never,
> extends BaseEntity<T, TOptionalInput> {
  private domainEvents: IDomainEvent[] = [];

  /**
   * Add a domain event to this aggregate
   */
  protected addDomainEvent(event: IDomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Dispatch all events through the event bus
   */
  public async dispatchAll(bus: IDomainEventBus): Promise<void> {
    await bus.publishAll(this.getUncommittedEvents());
    this.clearEvents();
  }

  /**
   * Get all uncommitted domain events
   */
  getUncommittedEvents(): IDomainEvent[] {
    return [...this.domainEvents];
  }

  /**
   * Clear all domain events (call after publishing)
   */
  clearEvents(): void {
    this.domainEvents = [];
  }

  /**
   * Check if aggregate has uncommitted events
   */
  hasUncommittedEvents(): boolean {
    return this.domainEvents.length > 0;
  }

  /**
   * Get a domain event by name
   */
  getEvent(eventName: string): IDomainEvent | undefined {
    return this.domainEvents.find((event) => event.eventName === eventName);
  }

  /**
   * Check if an event has been added to the aggregate
   */
  hasEvent(eventName: string): boolean {
    return this.domainEvents.some((event) => event.eventName === eventName);
  }
}
