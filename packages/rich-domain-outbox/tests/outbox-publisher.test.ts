import {
  IDomainEvent,
  IDomainEventBus,
  IOutboxStore,
  OutboxEntryData,
  OutboxFetchResult,
} from "@woltz/rich-domain";
import { OutboxPublisher } from "../src/outbox-publisher";

// ---------------------------------------------------------------------------
// In-memory test doubles
// ---------------------------------------------------------------------------

class InMemoryOutboxStore implements IOutboxStore {
  entries: Map<string, OutboxEntryData> = new Map();

  async save(events: IDomainEvent[]): Promise<void> {
    for (const e of events) {
      this.entries.set(e.eventId, {
        id: e.eventId,
        eventName: e.eventName,
        payload: e.payload,
        occurredOn: e.occurredOn,
        status: "pending",
        retries: 0,
        lastError: null,
        createdAt: new Date(),
      });
    }
  }

  async fetchPending(batchSize = 50): Promise<OutboxFetchResult> {
    const pending: OutboxEntryData[] = [];
    for (const [, entry] of this.entries) {
      if (entry.status === "pending") {
        pending.push(entry);
        if (pending.length >= batchSize) break;
      }
    }
    return { entries: pending };
  }

  async markPublished(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (entry) {
      this.entries.set(id, { ...entry, status: "published" });
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const entry = this.entries.get(id);
    if (entry) {
      this.entries.set(id, {
        ...entry,
        status: "failed",
        retries: entry.retries + 1,
        lastError: error,
      });
    }
  }
}

class MockEventBus implements IDomainEventBus {
  published: IDomainEvent[] = [];
  shouldFail = false;

  async publish(event: IDomainEvent): Promise<void> {
    if (this.shouldFail) throw new Error("Mock failure");
    this.published.push(event);
  }

  async publishAll(events: IDomainEvent[]): Promise<void> {
    if (this.shouldFail) throw new Error("Mock failure");
    this.published.push(...events);
  }
}

function noopLogger(): Pick<typeof console, "info" | "warn" | "error"> {
  return { info() {}, warn() {}, error() {} };
}

function makeEvent(id: string): IDomainEvent {
  return {
    eventId: id,
    eventName: "TestEvent",
    occurredOn: new Date(),
    payload: {},
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OutboxPublisher", () => {
  let store: InMemoryOutboxStore;
  let bus: MockEventBus;
  let publisher: OutboxPublisher;

  beforeEach(() => {
    store = new InMemoryOutboxStore();
    bus = new MockEventBus();
    publisher = new OutboxPublisher(store, bus, { logger: noopLogger() });
  });

  describe("processOnce()", () => {
    it("should process pending events and mark them published", async () => {
      await store.save([makeEvent("evt-1"), makeEvent("evt-2")]);

      const count = await publisher.processOnce();

      expect(count).toBe(2);
      expect(bus.published).toHaveLength(2);
      expect(store.entries.get("evt-1")?.status).toBe("published");
      expect(store.entries.get("evt-2")?.status).toBe("published");
    });

    it("should return 0 when no pending events exist", async () => {
      const count = await publisher.processOnce();
      expect(count).toBe(0);
      expect(bus.published).toHaveLength(0);
    });

    it("should mark events as failed when publish throws", async () => {
      await store.save([makeEvent("evt-1")]);
      bus.shouldFail = true;

      const count = await publisher.processOnce();

      expect(count).toBe(1);
      expect(store.entries.get("evt-1")?.status).toBe("failed");
      expect(store.entries.get("evt-1")?.retries).toBe(1);
    });

    it("should respect batchSize", async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        makeEvent(`evt-${i}`)
      );
      await store.save(events);

      const limitedPublisher = new OutboxPublisher(store, bus, {
        batchSize: 3,
        logger: noopLogger(),
      });

      const count = await limitedPublisher.processOnce();
      expect(count).toBe(3);
    });
  });

  describe("start / stop", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should be idempotent on start", async () => {
      publisher.start();
      publisher.start();
      expect(publisher.isRunning).toBe(true);
      await publisher.stop();
    });

    it("should stop cleanly", async () => {
      publisher.start();
      expect(publisher.isRunning).toBe(true);
      await publisher.stop();
      expect(publisher.isRunning).toBe(false);
    });
  });

  describe("config defaults", () => {
    it("should use sensible defaults", () => {
      const p = new OutboxPublisher(store, bus);
      // Just verify construction doesn't throw
      expect(p).toBeDefined();
    });
  });
});
