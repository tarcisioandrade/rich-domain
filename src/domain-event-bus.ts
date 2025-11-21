// ============================================================================
// Domain Event Bus - Pub/Sub for Domain Events
// ============================================================================

import {
  IDomainEvent,
  DomainEventHandler,
  IDomainEventHandler,
} from "./domain-event";

type EventConstructor<T extends IDomainEvent = IDomainEvent> = new (
  ...args: any[]
) => T;

/**
 * Domain Event Bus - Singleton pattern for event pub/sub
 */
export class DomainEventBus {
  private static instance: DomainEventBus;
  private handlers: Map<
    string,
    Set<DomainEventHandler<any> | IDomainEventHandler<any>>
  > = new Map();
  private wildcardHandlers: Set<
    DomainEventHandler<any> | IDomainEventHandler<any>
  > = new Set();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe<T extends IDomainEvent>(props: {
    event: EventConstructor<T> | string;
    handler: DomainEventHandler<T> | IDomainEventHandler<T>;
  }): void {
    const { event, handler } = props;
    const eventName = typeof event === "string" ? event : event.name;

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    this.handlers.get(eventName)!.add(handler);
  }

  /**
   * Subscribe to all events (wildcard)
   */
  subscribeAll(
    handler:
      | DomainEventHandler<IDomainEvent>
      | IDomainEventHandler<IDomainEvent>
  ): void {
    this.wildcardHandlers.add(handler);
  }

  /**
   * Unsubscribe from a specific event type
   */
  unsubscribe<T extends IDomainEvent>(
    eventType: EventConstructor<T> | string,
    handler: DomainEventHandler<T> | IDomainEventHandler<T>
  ): void {
    const eventName =
      typeof eventType === "string" ? eventType : eventType.name;
    const handlers = this.handlers.get(eventName);

    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventName);
      }
    }
  }

  /**
   * Unsubscribe from all events
   */
  unsubscribeAll(
    handler:
      | DomainEventHandler<IDomainEvent>
      | IDomainEventHandler<IDomainEvent>
  ): void {
    this.wildcardHandlers.delete(handler);
  }

  /**
   * Publish a single event
   */
  async publish<T extends IDomainEvent>(event: T): Promise<void> {
    const eventName = event.eventName;
    const handlers = this.handlers.get(eventName) || new Set();

    // Execute specific handlers
    const specificPromises = Array.from(handlers).map((handler) =>
      this.executeHandler(handler, event)
    );

    // Execute wildcard handlers
    const wildcardPromises = Array.from(this.wildcardHandlers).map((handler) =>
      this.executeHandler(handler, event)
    );

    await Promise.all([...specificPromises, ...wildcardPromises]);
  }

  /**
   * Publish multiple events
   */
  async publishAll(events: IDomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearAllHandlers(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }

  /**
   * Get count of handlers for an event type
   */
  getHandlerCount(eventType: EventConstructor | string): number {
    const eventName =
      typeof eventType === "string" ? eventType : eventType.name;
    return this.handlers.get(eventName)?.size || 0;
  }

  /**
   * Execute a handler (function or class)
   */
  private async executeHandler(
    handler: DomainEventHandler<any> | IDomainEventHandler<any>,
    event: IDomainEvent
  ): Promise<void> {
    try {
      if (typeof handler === "function") {
        await handler(event);
      } else {
        await handler.handle(event);
      }
    } catch (error) {
      console.error(`Error handling event ${event.eventName}:`, error);
      // Don't throw - we don't want one handler failure to break others
    }
  }
}

/**
 * Convenience function to get the event bus instance
 */
export function getEventBus(): DomainEventBus {
  return DomainEventBus.getInstance();
}
