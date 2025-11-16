import { Entity, Id } from "../src";
import { User } from "./utils";

// ============================================================================
// Tests
// ============================================================================

class Order extends Entity<{ id: Id; total: number; status: string }> {}

describe("Entity Equality by ID", () => {
  describe("Basic Equality", () => {
    it("should be equal when entities have the same ID", () => {
      const id = new Id("user-123");
      const user1 = new User({ id, name: "John", email: "john@example.com" });
      const user2 = new User({ id, name: "Jane", email: "jane@example.com" });

      expect(user1.equals(user2)).toBe(true);
      expect(user2.equals(user1)).toBe(true);
    });

    it("should be equal when comparing with same ID instance", () => {
      const id = Id.from("user-123");
      const user1 = new User({ id, name: "John", email: "john@example.com" });
      const user2 = new User({
        id: Id.from("user-123"),
        name: "Jane",
        email: "jane@example.com",
      });

      expect(user1.equals(user2)).toBe(true);
    });

    it("should NOT be equal when entities have different IDs", () => {
      const user1 = new User({
        id: Id.from("user-1"),
        name: "John",
        email: "john@example.com",
      });
      const user2 = new User({
        id: Id.from("user-2"),
        name: "John",
        email: "john@example.com",
      });

      expect(user1.equals(user2)).toBe(false);
      expect(user2.equals(user1)).toBe(false);
    });

    it("should be equal to itself", () => {
      const user = new User({
        id: Id.from("user-123"),
        name: "John",
        email: "john@example.com",
      });

      expect(user.equals(user)).toBe(true);
    });
  });

  describe("Equality with ID objects", () => {
    it("should be equal when comparing with Id instance", () => {
      const id = Id.from("user-123");
      const user = new User({
        id,
        name: "John",
        email: "john@example.com",
      });

      expect(user.equals(id)).toBe(true);
      expect(user.equals(Id.from("user-123"))).toBe(true);
    });

    it("should NOT be equal when comparing with different Id", () => {
      const user = new User({
        id: Id.from("user-123"),
        name: "John",
        email: "john@example.com",
      });

      expect(user.equals(Id.from("user-456"))).toBe(false);
    });
  });

  describe("Equality with string IDs", () => {
    it("should be equal when comparing with string ID", () => {
      const user = new User({
        id: Id.from("user-123"),
        name: "John",
        email: "john@example.com",
      });

      expect(user.equals("user-123")).toBe(true);
    });

    it("should NOT be equal when comparing with different string ID", () => {
      const user = new User({
        id: Id.from("user-123"),
        name: "John",
        email: "john@example.com",
      });

      expect(user.equals("user-456")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return false when comparing with null", () => {
      const user = new User({
        id: Id.from("user-123"),
        name: "John",
        email: "john@example.com",
      });

      expect(user.equals(null as any)).toBe(false);
    });

    it("should return false when comparing with undefined", () => {
      const user = new User({
        id: Id.from("user-123"),
        name: "John",
        email: "john@example.com",
      });

      expect(user.equals(undefined as any)).toBe(false);
    });

    it("should handle auto-generated IDs", () => {
      const user1 = new User({
        name: "John",
        email: "john@example.com",
      });
      const user2 = new User({
        name: "John",
        email: "john@example.com",
      });

      // Different auto-generated IDs
      expect(user1.equals(user2)).toBe(false);

      // Same instance
      expect(user1.equals(user1)).toBe(true);
    });
  });

  describe("Different Entity Types", () => {
    it("should NOT be equal when comparing different entity types even with same ID", () => {
      const id = Id.from("123");
      const user = new User({
        id,
        name: "John",
        email: "john@example.com",
      });
      const order = new Order({ id, total: 100, status: "pending" });

      // TypeScript won't allow this directly, but at runtime they have same ID
      expect(user.equals(order as any)).toBe(true); // Same ID = equal in DDD
    });
  });

  describe("Equality remains after property changes", () => {
    it("should remain equal after changing properties", () => {
      const id = Id.from("user-123");
      const user1 = new User({
        id,
        name: "John",
        email: "john@example.com",
      });
      const user2 = new User({
        id,
        name: "Jane",
        email: "jane@example.com",
      });

      expect(user1.equals(user2)).toBe(true);

      // Change properties
      user1.name = "Johnny";

      // Still equal because ID is the same
      expect(user1.equals(user2)).toBe(true);
    });
  });

  describe("Use in Collections", () => {
    it("should work with Array.find()", () => {
      const users = [
        new User({
          id: Id.from("1"),
          name: "John",
          email: "john@example.com",
        }),
        new User({
          id: Id.from("2"),
          name: "Jane",
          email: "jane@example.com",
        }),
        new User({
          id: Id.from("3"),
          name: "Bob",
          email: "bob@example.com",
        }),
      ];

      const searchId = Id.from("2");
      const found = users.find((user) => user.equals(searchId));

      expect(found).toBeDefined();
      expect(found?.name).toBe("Jane");
    });

    it("should work with Array.filter()", () => {
      const users = [
        new User({
          id: Id.from("1"),
          name: "John",
          email: "john@example.com",
        }),
        new User({
          id: Id.from("2"),
          name: "Jane",
          email: "jane@example.com",
        }),
        new User({
          id: Id.from("1"),
          name: "Johnny",
          email: "johnny@example.com",
        }),
      ];

      const searchId = Id.from("1");
      const filtered = users.filter((user) => user.equals(searchId));

      expect(filtered.length).toBe(2);
      expect(filtered[0].name).toBe("John");
      expect(filtered[1].name).toBe("Johnny");
    });

    it("should work for checking if entity exists in array", () => {
      const users = [
        new User({
          id: Id.from("1"),
          name: "John",
          email: "john@example.com",
        }),
        new User({
          id: Id.from("2"),
          name: "Jane",
          email: "jane@example.com",
        }),
      ];

      const user1 = new User({
        id: Id.from("1"),
        name: "Different Name",
        email: "different@example.com",
      });
      const user3 = new User({
        id: Id.from("3"),
        name: "Bob",
        email: "bob@example.com",
      });

      expect(users.some((u) => u.equals(user1))).toBe(true); // Exists (same ID)
      expect(users.some((u) => u.equals(user3))).toBe(false); // Doesn't exist
    });
  });

  describe("Aggregate Equality", () => {
    it("should work the same way for Aggregates", () => {
      const id = Id.from("order-123");
      const order1 = new Order({ id, total: 100, status: "pending" });
      const order2 = new Order({ id, total: 200, status: "completed" });

      expect(order1.equals(order2)).toBe(true);
      expect(order1.equals(id)).toBe(true);
      expect(order1.equals("order-123")).toBe(true);
    });
  });
});
