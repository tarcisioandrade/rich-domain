import { BaseEntity } from "./base-entity.js";
import { BaseProps, IDomainEvent, IDomainEventBus } from "../types/index.js";

/**
 * WeakMap-based storage for domain events.
 * Using a WeakMap avoids ES2022 class field initialization order issues:
 * class fields are set AFTER super() returns, which would overwrite any
 * events added during the `onCreate` hook (called inside super()).
 */
const eventsStore = new WeakMap<BaseAggregate<any>, IDomainEvent[]>();

function getEvents(instance: BaseAggregate<any>): IDomainEvent[] {
  if (!eventsStore.has(instance)) eventsStore.set(instance, []);
  return eventsStore.get(instance)!;
}

/**
 * Base class for Aggregates that adds domain event management capabilities.
 * In Domain-Driven Design (DDD), only Aggregates (aggregate roots) should emit domain events.
 * Regular Entities and Value Objects should NOT manage domain events.
 */
export abstract class BaseAggregate<
  T extends BaseProps,
  TOptionalInput extends keyof T = never,
> extends BaseEntity<T, TOptionalInput> {
  /**
   * Add a domain event to this aggregate.
   * Safe to call inside the `onCreate` hook.
   */
  protected addDomainEvent(event: IDomainEvent): void {
    getEvents(this).push(event);
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
    return [...getEvents(this)];
  }

  /**
   * Clear all domain events (call after publishing)
   */
  clearEvents(): void {
    eventsStore.set(this, []);
  }

  /**
   * Check if aggregate has uncommitted events
   */
  hasUncommittedEvents(): boolean {
    return getEvents(this).length > 0;
  }

  /**
   * Get a domain event by name
   */
  getEvent(eventName: string): IDomainEvent | undefined {
    return getEvents(this).find((event) => event.eventName === eventName);
  }

  /**
   * Check if an event has been added to the aggregate
   */
  hasEvent(eventName: string): boolean {
    return getEvents(this).some((event) => event.eventName === eventName);
  }
}
