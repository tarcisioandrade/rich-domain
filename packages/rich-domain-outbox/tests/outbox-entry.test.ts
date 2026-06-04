import { OutboxEntry } from "../src/outbox-entry";

describe("OutboxEntry", () => {
  const baseProps = {
    id: "evt-1",
    eventName: "OrderPlaced",
    payload: { orderId: "abc", total: 150 },
    occurredOn: new Date("2025-01-01T00:00:00Z"),
    status: "pending" as const,
    retries: 0,
    lastError: null,
    createdAt: new Date("2025-01-01T00:00:01Z"),
  };

  it("should construct with all fields", () => {
    const entry = new OutboxEntry(baseProps);
    expect(entry.id).toBe("evt-1");
    expect(entry.eventName).toBe("OrderPlaced");
    expect(entry.status).toBe("pending");
  });

  it("should be frozen (immutable)", () => {
    const entry = new OutboxEntry(baseProps);
    expect(() => {
      (entry as any).status = "published";
    }).toThrow();
  });

  describe("canRetry()", () => {
    it("should return true when retries < maxRetries", () => {
      const entry = new OutboxEntry({ ...baseProps, retries: 1 });
      expect(entry.canRetry(3)).toBe(true);
    });

    it("should return false when retries >= maxRetries", () => {
      const entry = new OutboxEntry({ ...baseProps, retries: 3 });
      expect(entry.canRetry(3)).toBe(false);
    });
  });

  describe("status helpers", () => {
    it("isPending should work", () => {
      expect(new OutboxEntry(baseProps).isPending).toBe(true);
    });

    it("isPublished should work", () => {
      expect(
        new OutboxEntry({ ...baseProps, status: "published" }).isPublished
      ).toBe(true);
    });

    it("isFailed should work", () => {
      expect(new OutboxEntry({ ...baseProps, status: "failed" }).isFailed).toBe(
        true
      );
    });
  });

  describe("toJSON()", () => {
    it("should serialize dates as ISO strings", () => {
      const entry = new OutboxEntry(baseProps);
      const json = entry.toJSON();
      expect(json.occurredOn).toBe("2025-01-01T00:00:00.000Z");
      expect(json.createdAt).toBe("2025-01-01T00:00:01.000Z");
    });
  });
});
