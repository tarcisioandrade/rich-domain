import {
  Id,
  Aggregate,
  DomainEvent,
  DomainEventBus,
  IDomainEventHandler,
  BaseProps,
} from "../src";

// ============================================================================
// Test Events
// ============================================================================

class UserCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: Id,
    public readonly email: string,
    public readonly name: string
  ) {
    super(aggregateId);
  }

  protected getPayload() {
    return {
      email: this.email,
      name: this.name,
    };
  }
}

class UserActivatedEvent extends DomainEvent {
  constructor(aggregateId: Id) {
    super(aggregateId);
  }
}

class UserDeactivatedEvent extends DomainEvent {
  constructor(aggregateId: Id) {
    super(aggregateId);
  }
}

class OrderPlacedEvent extends DomainEvent {
  constructor(aggregateId: Id, public readonly total: number) {
    super(aggregateId);
  }

  protected getPayload() {
    return {
      total: this.total,
    };
  }
}

// ============================================================================
// Test Aggregates
// ============================================================================

interface UserProps extends BaseProps {
  id: Id;
  email: string;
  name: string;
  status: "active" | "inactive";
}

class User extends Aggregate<UserProps> {
  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): string {
    return this.props.status;
  }

  static create(email: string, name: string): User {
    const user = new User({ email, name, status: "inactive" });
    user.addDomainEvent(new UserCreatedEvent(user.id, email, name));
    return user;
  }

  activate(): void {
    this.props.status = "active";
    this.addDomainEvent(new UserActivatedEvent(this.id));
  }

  deactivate(): void {
    this.props.status = "inactive";
    this.addDomainEvent(new UserDeactivatedEvent(this.id));
  }
}

describe("Domain Events", () => {
  let eventBus: DomainEventBus;

  beforeEach(() => {
    eventBus = DomainEventBus.getInstance();
    eventBus.clearAllHandlers();
  });

  afterEach(() => {
    eventBus.clearAllHandlers();
  });

  describe("DomainEvent", () => {
    it("should create event with auto-generated ID", () => {
      const userId = new Id();
      const event = new UserCreatedEvent(
        userId,
        "test@example.com",
        "Test User"
      );

      expect(event.eventId).toBeDefined();
      expect(event.eventName).toBe("UserCreatedEvent");
      expect(event.aggregateId).toBe(userId.value);
      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it("should serialize event to JSON", () => {
      const userId = new Id("user-123");
      const event = new UserCreatedEvent(
        userId,
        "test@example.com",
        "Test User"
      );

      const json = event.toJSON();

      expect(json.eventId).toBeDefined();
      expect(json.eventName).toBe("UserCreatedEvent");
      expect(json.aggregateId).toBe("user-123");
      expect(json.email).toBe("test@example.com");
      expect(json.name).toBe("Test User");
      expect(json.occurredOn).toBeDefined();
    });

    it("should accept Id.from as aggregateId", () => {
      const event = new UserCreatedEvent(
        Id.from("user-123"),
        "test@example.com",
        "Test"
      );

      expect(event.aggregateId).toBe("user-123");
    });
  });

  describe("Aggregate with Events", () => {
    it("should add events to aggregate", () => {
      const user = User.create("test@example.com", "Test User");

      expect(user.hasUncommittedEvents()).toBe(true);
      expect(user.getUncommittedEvents().length).toBe(1);
    });

    it("should get uncommitted events", () => {
      const user = User.create("test@example.com", "Test User");
      const events = user.getUncommittedEvents();

      expect(events[0]).toBeInstanceOf(UserCreatedEvent);
      expect(events[0].eventName).toBe("UserCreatedEvent");
    });

    it("should accumulate multiple events", () => {
      const user = User.create("test@example.com", "Test User");
      user.activate();
      user.deactivate();

      expect(user.getUncommittedEvents().length).toBe(3);
      expect(user.getUncommittedEvents()[0]).toBeInstanceOf(UserCreatedEvent);
      expect(user.getUncommittedEvents()[1]).toBeInstanceOf(UserActivatedEvent);
      expect(user.getUncommittedEvents()[2]).toBeInstanceOf(
        UserDeactivatedEvent
      );
    });

    it("should clear events", () => {
      const user = User.create("test@example.com", "Test User");

      expect(user.hasUncommittedEvents()).toBe(true);

      user.clearEvents();

      expect(user.hasUncommittedEvents()).toBe(false);
      expect(user.getUncommittedEvents().length).toBe(0);
    });
  });

  describe("DomainEventBus", () => {
    it("should get singleton instance", () => {
      const bus1 = DomainEventBus.getInstance();
      const bus2 = DomainEventBus.getInstance();

      expect(bus1).toBe(bus2);
    });

    it("should subscribe and publish events with function handler", async () => {
      const handler = jest.fn();

      eventBus.subscribe({ event: UserCreatedEvent, handler });

      const event = new UserCreatedEvent(new Id(), "test@example.com", "Test");
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it("should subscribe and publish events with class handler", async () => {
      const handleFn = jest.fn();

      class UserCreatedHandler
        implements IDomainEventHandler<UserCreatedEvent>
      {
        async handle(event: UserCreatedEvent): Promise<void> {
          handleFn(event);
        }
      }

      const handler = new UserCreatedHandler();
      eventBus.subscribe({ event: UserCreatedEvent, handler });

      const event = new UserCreatedEvent(new Id(), "test@example.com", "Test");
      await eventBus.publish(event);

      expect(handleFn).toHaveBeenCalledTimes(1);
    });

    it("should subscribe by event name string", async () => {
      const handler = jest.fn();

      eventBus.subscribe({ event: "UserCreatedEvent", handler });

      const event = new UserCreatedEvent(new Id(), "test@example.com", "Test");
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple subscribers for same event", async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      eventBus.subscribe({ event: UserCreatedEvent, handler: handler1 });
      eventBus.subscribe({ event: UserCreatedEvent, handler: handler2 });
      eventBus.subscribe({ event: UserCreatedEvent, handler: handler3 });

      const event = new UserCreatedEvent(new Id(), "test@example.com", "Test");
      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it("should only trigger subscribers for specific event type", async () => {
      const userHandler = jest.fn();
      const orderHandler = jest.fn();

      eventBus.subscribe({ event: UserCreatedEvent, handler: userHandler });
      eventBus.subscribe({ event: OrderPlacedEvent, handler: orderHandler });

      const userEvent = new UserCreatedEvent(
        new Id(),
        "test@example.com",
        "Test"
      );
      await eventBus.publish(userEvent);

      expect(userHandler).toHaveBeenCalledTimes(1);
      expect(orderHandler).not.toHaveBeenCalled();
    });

    it("should subscribe to all events with wildcard", async () => {
      const wildcardHandler = jest.fn();

      eventBus.subscribeAll(wildcardHandler);

      const event1 = new UserCreatedEvent(new Id(), "test@example.com", "Test");
      const event2 = new OrderPlacedEvent(new Id(), 100);

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      expect(wildcardHandler).toHaveBeenCalledTimes(2);
    });

    it("should trigger both specific and wildcard handlers", async () => {
      const specificHandler = jest.fn();
      const wildcardHandler = jest.fn();

      eventBus.subscribe({ event: UserCreatedEvent, handler: specificHandler });
      eventBus.subscribeAll(wildcardHandler);

      const event = new UserCreatedEvent(new Id(), "test@example.com", "Test");
      await eventBus.publish(event);

      expect(specificHandler).toHaveBeenCalledTimes(1);
      expect(wildcardHandler).toHaveBeenCalledTimes(1);
    });

    it("should unsubscribe handler", async () => {
      const handler = jest.fn();

      eventBus.subscribe({ event: UserCreatedEvent, handler });
      eventBus.unsubscribe(UserCreatedEvent, handler);

      const event = new UserCreatedEvent(new Id(), "test@example.com", "Test");
      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should unsubscribe wildcard handler", async () => {
      const handler = jest.fn();

      eventBus.subscribeAll(handler);
      eventBus.unsubscribeAll(handler);

      const event = new UserCreatedEvent(new Id(), "test@example.com", "Test");
      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should publish multiple events", async () => {
      const handler = jest.fn();

      eventBus.subscribe({ event: UserCreatedEvent, handler });
      eventBus.subscribe({ event: UserActivatedEvent, handler });

      const events = [
        new UserCreatedEvent(new Id(), "test@example.com", "Test"),
        new UserActivatedEvent(new Id()),
      ];

      await eventBus.publishAll(events);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("should get handler count", () => {
      eventBus.subscribe({ event: UserCreatedEvent, handler: jest.fn() });
      eventBus.subscribe({ event: UserCreatedEvent, handler: jest.fn() });
      eventBus.subscribe({ event: OrderPlacedEvent, handler: jest.fn() });

      expect(eventBus.getHandlerCount(UserCreatedEvent)).toBe(2);
      expect(eventBus.getHandlerCount(OrderPlacedEvent)).toBe(1);
      expect(eventBus.getHandlerCount(UserActivatedEvent)).toBe(0);
    });

    it("should handle async handlers", async () => {
      const results: string[] = [];

      const asyncHandler = async (event: UserCreatedEvent) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(`Handled: ${event.email}`);
      };

      eventBus.subscribe({ event: UserCreatedEvent, handler: asyncHandler });

      const event = new UserCreatedEvent(new Id(), "test@example.com", "Test");
      await eventBus.publish(event);

      expect(results).toContain("Handled: test@example.com");
    });

    it("should not throw if handler throws error", async () => {
      const errorHandler = jest.fn(() => {
        throw new Error("Handler error");
      });
      const goodHandler = jest.fn();

      eventBus.subscribe({ event: UserCreatedEvent, handler: errorHandler });
      eventBus.subscribe({ event: UserCreatedEvent, handler: goodHandler });

      const event = new UserCreatedEvent(new Id(), "test@example.com", "Test");

      // Should not throw
      await expect(eventBus.publish(event)).resolves.not.toThrow();

      // Both handlers should have been called
      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
    });
  });

  describe("End-to-End Workflow", () => {
    it("should follow complete event workflow", async () => {
      const emailsSent: string[] = [];

      // Subscribe to user created events
      eventBus.subscribe({
        event: UserCreatedEvent,
        handler: (event) => {
          emailsSent.push(`Welcome email sent to ${event.email}`);
        },
      });

      // Subscribe to user activated events
      eventBus.subscribe({
        event: UserActivatedEvent,
        handler: async (event) => {
          emailsSent.push(
            `Activation email sent for user ${event.aggregateId}`
          );
        },
      });

      // Create and activate user
      const user = User.create("john@example.com", "John Doe");
      user.activate();

      // Get events and publish them
      await user.dispatchAll(eventBus);

      // Clear events after publishing
      user.clearEvents();

      expect(emailsSent).toHaveLength(2);
      expect(emailsSent[0]).toBe("Welcome email sent to john@example.com");
      expect(emailsSent[1]).toContain("Activation email sent for user");
      expect(user.hasUncommittedEvents()).toBe(false);
    });
  });
});
