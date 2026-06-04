import {
  IDomainEvent,
  IDomainEventBus,
  IOutboxStore,
  OutboxFetchResult,
} from "@woltz/rich-domain";
import { OutboxEventBusDecorator } from "../src/outbox-event-bus-decorator";

/**
 * Minimal in-memory outbox store for unit testing.
 */
class InMemoryOutboxStore implements IOutboxStore {
  private entries: Map<string, { status: string; error?: string }> = new Map();
  private savedEvents: IDomainEvent[][] = [];

  async save(events: IDomainEvent[]): Promise<void> {
    this.savedEvents.push(events);
    for (const e of events) {
      this.entries.set(e.eventId, { status: "pending" });
    }
  }

  async fetchPending(): Promise<OutboxFetchResult> {
    const pending: any[] = [];
    for (const [id, entry] of this.entries) {
      if (entry.status === "pending" || entry.status === "failed") {
        pending.push({
          id,
          eventName: "TestEvent",
          payload: {},
          occurredOn: new Date(),
          status: entry.status,
          retries: 0,
          lastError: null,
          createdAt: new Date(),
        });
      }
    }
    return { entries: pending };
  }

  async markPublished(id: string): Promise<void> {
    this.entries.set(id, { status: "published" });
  }

  async markFailed(id: string, error: string): Promise<void> {
    this.entries.set(id, { status: "failed", error });
  }

  getStatus(eventId: string): string | undefined {
    return this.entries.get(eventId)?.status;
  }

  getSavedEvents(): IDomainEvent[][] {
    return this.savedEvents;
  }
}

/**
 * Mock event bus that can be configured to succeed or fail.
 */
class MockEventBus implements IDomainEventBus {
  public publishedEvents: IDomainEvent[] = [];
  private shouldFail = false;

  setFail(value: boolean): void {
    this.shouldFail = value;
  }

  async publish(event: IDomainEvent): Promise<void> {
    if (this.shouldFail) throw new Error("Mock publish failure");
    this.publishedEvents.push(event);
  }

  async publishAll(events: IDomainEvent[]): Promise<void> {
    if (this.shouldFail) throw new Error("Mock publishAll failure");
    this.publishedEvents.push(...events);
  }
}

function makeEvent(id: string, payload?: unknown): IDomainEvent {
  return {
    eventId: id,
    eventName: "TestEvent",
    occurredOn: new Date(),
    payload: payload ?? { data: "test" },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OutboxEventBusDecorator", () => {
  let inner: MockEventBus;
  let store: InMemoryOutboxStore;
  let decorator: OutboxEventBusDecorator;

  beforeEach(() => {
    inner = new MockEventBus();
    store = new InMemoryOutboxStore();
    decorator = new OutboxEventBusDecorator(inner, store);
  });

  describe("publish()", () => {
    it("should publish via inner bus and mark as published on success", async () => {
      const event = makeEvent("evt-1");
      await decorator.publish(event);

      expect(inner.publishedEvents).toHaveLength(1);
      expect(inner.publishedEvents[0].eventId).toBe("evt-1");
      expect(store.getStatus("evt-1")).toBe("published");
    });

    it("should mark as failed and re-throw when inner bus fails", async () => {
      inner.setFail(true);
      const event = makeEvent("evt-2");

      await expect(decorator.publish(event)).rejects.toThrow(
        "Mock publish failure"
      );
      expect(store.getStatus("evt-2")).toBe("failed");
    });
  });

  describe("publishAll()", () => {
    it("should publish all events via inner bus and mark them published", async () => {
      const events = [makeEvent("evt-1"), makeEvent("evt-2")];
      await decorator.publishAll(events);

      expect(inner.publishedEvents).toHaveLength(2);
      expect(store.getStatus("evt-1")).toBe("published");
      expect(store.getStatus("evt-2")).toBe("published");
    });

    it("should mark all as failed when inner bus throws", async () => {
      inner.setFail(true);
      const events = [makeEvent("evt-1"), makeEvent("evt-2")];

      await expect(decorator.publishAll(events)).rejects.toThrow(
        "Mock publishAll failure"
      );
      expect(store.getStatus("evt-1")).toBe("failed");
      expect(store.getStatus("evt-2")).toBe("failed");
    });

    it("should handle empty array", async () => {
      await decorator.publishAll([]);
      expect(inner.publishedEvents).toHaveLength(0);
    });
  });

  describe("IDomainEventBus contract", () => {
    it("should satisfy the IDomainEventBus interface", () => {
      const bus: IDomainEventBus = decorator;
      expect(bus).toBeDefined();
    });
  });
});
