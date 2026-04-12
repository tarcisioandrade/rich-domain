import { AggregateChanges } from "../src/core/index";

describe("AggregateChanges", () => {
  let changes: AggregateChanges;

  beforeEach(() => {
    changes = new AggregateChanges();
  });

  describe("isEmpty / hasChanges", () => {
    it("should be empty initially", () => {
      expect(changes.isEmpty()).toBe(true);
      expect(changes.hasChanges()).toBe(false);
      expect(changes.count).toBe(0);
    });

    it("should not be empty after adding operation", () => {
      changes.addCreate("User", { id: "1", name: "Test" }, 0);
      expect(changes.isEmpty()).toBe(false);
      expect(changes.hasChanges()).toBe(true);
      expect(changes.count).toBe(1);
    });
  });

  describe("addCreate", () => {
    it("should add create operation", () => {
      const data = { id: "1", name: "Test User" };
      changes.addCreate("User", data, 0);

      expect(changes.hasCreates()).toBe(true);
      expect(changes.creates()).toHaveLength(1);
      expect(changes.creates()[0]).toMatchObject({
        type: "create",
        entity: "User",
        data,
        depth: 0,
      });
    });

    it("should add create with parent info", () => {
      const data = { id: "post-1", title: "Test Post" };
      changes.addCreate("Post", data, 1, "user-1", "User");

      const create = changes.creates()[0];
      expect(create.parentId).toBe("user-1");
      expect(create.parentEntity).toBe("User");
    });
  });

  describe("addUpdate", () => {
    it("should add update operation", () => {
      const data = { id: "1", name: "Updated" };
      const changedFields = { name: "Updated" };
      changes.addUpdate("User", "1", data, changedFields, 0);

      expect(changes.hasUpdates()).toBe(true);
      expect(changes.updates()).toHaveLength(1);
      expect(changes.updates()[0]).toMatchObject({
        type: "update",
        entity: "User",
        id: "1",
        changedFields,
        depth: 0,
      });
    });
  });

  describe("addDelete", () => {
    it("should add delete operation", () => {
      const data = { id: "1", name: "To Delete" };
      changes.addDelete("User", "1", data, 0);

      expect(changes.hasDeletes()).toBe(true);
      expect(changes.deletes()).toHaveLength(1);
      expect(changes.deletes()[0]).toMatchObject({
        type: "delete",
        entity: "User",
        id: "1",
        depth: 0,
      });
    });
  });

  describe("ordering", () => {
    beforeEach(() => {
      // Add operations in random order
      changes.addCreate("Comment", { id: "c1" }, 2);
      changes.addDelete("Like", "l1", { id: "l1" }, 3);
      changes.addCreate("User", { id: "u1" }, 0);
      changes.addDelete("Comment", "c2", { id: "c2" }, 2);
      changes.addCreate("Post", { id: "p1" }, 1);
      changes.addDelete("Post", "p2", { id: "p2" }, 1);
    });

    it("should order creates by depth ASC (root → leaf)", () => {
      const creates = changes.creates();
      expect(creates[0].entity).toBe("User"); // depth 0
      expect(creates[1].entity).toBe("Post"); // depth 1
      expect(creates[2].entity).toBe("Comment"); // depth 2
    });

    it("should order deletes by depth DESC (leaf → root)", () => {
      const deletes = changes.deletes();
      expect(deletes[0].entity).toBe("Like"); // depth 3
      expect(deletes[1].entity).toBe("Comment"); // depth 2
      expect(deletes[2].entity).toBe("Post"); // depth 1
    });
  });

  describe("operations iterator", () => {
    it("should yield operations in correct order: deletes, creates, updates", () => {
      changes.addCreate("Post", { id: "p1" }, 1);
      changes.addUpdate("User", "u1", { id: "u1" }, { name: "New" }, 0);
      changes.addDelete("Comment", "c1", { id: "c1" }, 2);

      const ops = [...changes.operations()];

      expect(ops[0].type).toBe("delete"); // deletes first
      expect(ops[1].type).toBe("create"); // creates second
      expect(ops[2].type).toBe("update"); // updates last
    });
  });

  describe("toBatchOperations", () => {
    beforeEach(() => {
      // Creates
      changes.addCreate("User", { id: "u1" }, 0);
      changes.addCreate("Post", { id: "p1" }, 1, "u1", "User");
      changes.addCreate("Post", { id: "p2" }, 1, "u1", "User");
      changes.addCreate("Comment", { id: "c1" }, 2, "p1", "Post");

      // Updates
      changes.addUpdate("User", "u2", { id: "u2" }, { name: "Updated" }, 0);
      changes.addUpdate("Post", "p3", { id: "p3" }, { title: "New Title" }, 1);

      // Deletes
      changes.addDelete("Comment", "c2", { id: "c2" }, 2);
      changes.addDelete("Comment", "c3", { id: "c3" }, 2);
      changes.addDelete("Post", "p4", { id: "p4" }, 1);
    });

    it("should group deletes by entity and order by depth DESC", () => {
      const batch = changes.toBatchOperations();

      expect(batch.deletes).toHaveLength(2); // Comment and Post

      // Comments should come first (depth 2)
      expect(batch.deletes[0].entity).toBe("Comment");
      expect(batch.deletes[0].ids).toEqual(["c2", "c3"]);

      // Posts second (depth 1)
      expect(batch.deletes[1].entity).toBe("Post");
      expect(batch.deletes[1].ids).toEqual(["p4"]);
    });

    it("should group creates by entity and order by depth ASC", () => {
      const batch = changes.toBatchOperations();

      expect(batch.creates).toHaveLength(3); // User, Post, Comment

      // User first (depth 0)
      expect(batch.creates[0].entity).toBe("User");
      expect(batch.creates[0].items).toHaveLength(1);

      // Post second (depth 1)
      expect(batch.creates[1].entity).toBe("Post");
      expect(batch.creates[1].items).toHaveLength(2);

      // Comment last (depth 2)
      expect(batch.creates[2].entity).toBe("Comment");
      expect(batch.creates[2].items).toHaveLength(1);
    });

    it("should group updates by entity", () => {
      const batch = changes.toBatchOperations();

      expect(batch.updates).toHaveLength(2); // User and Post

      const userUpdates = batch.updates.find((u) => u.entity === "User");
      expect(userUpdates?.items).toHaveLength(1);
      expect(userUpdates?.items[0].id).toBe("u2");

      const postUpdates = batch.updates.find((u) => u.entity === "Post");
      expect(postUpdates?.items).toHaveLength(1);
      expect(postUpdates?.items[0].id).toBe("p3");
    });

    it("should include parentId in create items", () => {
      const batch = changes.toBatchOperations();

      const postCreates = batch.creates.find((c) => c.entity === "Post");
      expect(postCreates?.items[0].parentId).toBe("u1");
      expect(postCreates?.items[1].parentId).toBe("u1");

      const commentCreates = batch.creates.find((c) => c.entity === "Comment");
      expect(commentCreates?.items[0].parentId).toBe("p1");
    });
  });

  describe("for (filter by entity)", () => {
    beforeEach(() => {
      changes.addCreate("Post", { id: "p1", title: "Post 1" }, 1);
      changes.addCreate("Post", { id: "p2", title: "Post 2" }, 1);
      changes.addUpdate("Post", "p3", { id: "p3" }, { title: "Updated" }, 1);
      changes.addDelete("Post", "p4", { id: "p4" }, 1);
      changes.addCreate("Comment", { id: "c1" }, 2);
    });

    it("should filter creates by entity", () => {
      const postChanges = changes.of("Post");
      expect(postChanges.creates).toHaveLength(2);
      expect(postChanges.creates[0].id).toBe("p1");
    });

    it("should filter updates by entity", () => {
      const postChanges = changes.of("Post");
      expect(postChanges.updates).toHaveLength(1);
      expect(postChanges.updates[0].entity.id).toBe("p3");
    });

    it("should filter deletes by entity", () => {
      const postChanges = changes.of("Post");
      expect(postChanges.deletes).toHaveLength(1);
      expect(postChanges.deletes[0].id).toBe("p4");
    });

    it("should return empty for non-existent entity", () => {
      const userChanges = changes.of("User");
      expect(userChanges.isEmpty()).toBe(true);
    });

    it("should have helper methods", () => {
      const postChanges = changes.of("Post");
      expect(postChanges.hasCreates()).toBe(true);
      expect(postChanges.hasUpdates()).toBe(true);
      expect(postChanges.hasDeletes()).toBe(true);
      expect(postChanges.hasChanges()).toBe(true);
    });
  });

  describe("getAffectedEntities", () => {
    it("should return list of unique entities", () => {
      changes.addCreate("User", { id: "u1" }, 0);
      changes.addCreate("Post", { id: "p1" }, 1);
      changes.addUpdate("Post", "p2", { id: "p2" }, {}, 1);
      changes.addDelete("Comment", "c1", { id: "c1" }, 2);

      const entities = changes.getAffectedEntities();

      expect(entities).toContain("User");
      expect(entities).toContain("Post");
      expect(entities).toContain("Comment");
      expect(entities).toHaveLength(3);
    });
  });

  describe("clone", () => {
    it("should create independent copy", () => {
      changes.addCreate("User", { id: "u1" }, 0);

      const cloned = changes.clone();
      cloned.addCreate("Post", { id: "p1" }, 1);

      expect(changes.count).toBe(1);
      expect(cloned.count).toBe(2);
    });
  });

  describe("clear", () => {
    it("should remove all operations", () => {
      changes.addCreate("User", { id: "u1" }, 0);
      changes.addUpdate("Post", "p1", { id: "p1" }, {}, 1);

      changes.clear();

      expect(changes.isEmpty()).toBe(true);
      expect(changes.count).toBe(0);
    });
  });
});
