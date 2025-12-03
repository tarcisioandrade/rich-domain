import { AggregateChanges } from "../src";

describe("AggregateChanges - relationField", () => {
  let changes: AggregateChanges;

  beforeEach(() => {
    changes = new AggregateChanges();
  });

  describe("addCreate with relationField", () => {
    it("should store relationField in create operation", () => {
      const data = { id: "tag-1", name: "TypeScript" };
      changes.addCreate("Tag", data, 1, "post-1", "Post", "tags");

      const creates = changes.creates();
      expect(creates).toHaveLength(1);
      expect(creates[0].relationField).toBe("tags");
    });

    it("should allow undefined relationField", () => {
      const data = { id: "user-1", name: "John" };
      changes.addCreate("User", data, 0);

      const creates = changes.creates();
      expect(creates[0].relationField).toBeUndefined();
    });
  });

  describe("addDelete with relationField", () => {
    it("should store relationField in delete operation", () => {
      const data = { id: "tag-1", name: "TypeScript" };
      changes.addDelete("Tag", "tag-1", data, 1, "tags");

      const deletes = changes.deletes();
      expect(deletes).toHaveLength(1);
      expect(deletes[0].relationField).toBe("tags");
    });

    it("should allow undefined relationField", () => {
      const data = { id: "comment-1" };
      changes.addDelete("Comment", "comment-1", data, 1);

      const deletes = changes.deletes();
      expect(deletes[0].relationField).toBeUndefined();
    });
  });

  describe("toBatchOperations with relationField", () => {
    it("should group creates by entity AND relationField", () => {
      // Two tags added to 'tags' relation
      changes.addCreate("Tag", { id: "t1" }, 1, "post-1", "Post", "tags");
      changes.addCreate("Tag", { id: "t2" }, 1, "post-1", "Post", "tags");

      // One tag added to 'categories' relation (different relation, same entity)
      changes.addCreate("Tag", { id: "t3" }, 1, "post-1", "Post", "categories");

      const batch = changes.toBatchOperations();

      // Should have 2 separate groups
      expect(batch.creates).toHaveLength(2);

      const tagsGroup = batch.creates.find((c) => c.relationField === "tags");
      const categoriesGroup = batch.creates.find(
        (c) => c.relationField === "categories"
      );

      expect(tagsGroup?.items).toHaveLength(2);
      expect(categoriesGroup?.items).toHaveLength(1);
    });

    it("should group deletes by entity AND relationField", () => {
      // Two tags removed from 'tags' relation
      changes.addDelete("Tag", "t1", { id: "t1" }, 1, "tags");
      changes.addDelete("Tag", "t2", { id: "t2" }, 1, "tags");

      // One tag removed from 'categories' relation
      changes.addDelete("Tag", "t3", { id: "t3" }, 1, "categories");

      const batch = changes.toBatchOperations();

      expect(batch.deletes).toHaveLength(2);

      const tagsGroup = batch.deletes.find((d) => d.relationField === "tags");
      const categoriesGroup = batch.deletes.find(
        (d) => d.relationField === "categories"
      );

      expect(tagsGroup?.ids).toEqual(["t1", "t2"]);
      expect(categoriesGroup?.ids).toEqual(["t3"]);
    });

    it("should keep operations without relationField separate", () => {
      // Root level create (no relation)
      changes.addCreate("User", { id: "u1" }, 0);

      // Child create with relation
      changes.addCreate("Post", { id: "p1" }, 1, "u1", "User", "posts");

      const batch = changes.toBatchOperations();

      expect(batch.creates).toHaveLength(2);

      const userGroup = batch.creates.find((c) => c.entity === "User");
      const postGroup = batch.creates.find((c) => c.entity === "Post");

      expect(userGroup?.relationField).toBeUndefined();
      expect(postGroup?.relationField).toBe("posts");
    });

    it("should include relationField in BatchCreateItem", () => {
      changes.addCreate("Tag", { id: "t1" }, 1, "post-1", "Post", "tags");

      const batch = changes.toBatchOperations();
      const tagGroup = batch.creates.find((c) => c.entity === "Tag");

      expect(tagGroup?.items[0].relationField).toBe("tags");
    });
  });

  describe("forRelation", () => {
    beforeEach(() => {
      // Tags relation
      changes.addCreate("Tag", { id: "t1" }, 1, "post-1", "Post", "tags");
      changes.addDelete("Tag", "t2", { id: "t2" }, 1, "tags");

      // Comments relation (owned)
      changes.addCreate(
        "Comment",
        { id: "c1" },
        1,
        "post-1",
        "Post",
        "comments"
      );
      changes.addDelete("Comment", "c2", { id: "c2" }, 1, "comments");

      // Root update (no relation)
      changes.addUpdate(
        "Post",
        "post-1",
        { id: "post-1" },
        { title: "New" },
        0
      );
    });

    it("should filter operations by relationField", () => {
      const tagChanges = changes.forRelation("tags");

      expect(tagChanges.hasCreates()).toBe(true);
      expect(tagChanges.hasDeletes()).toBe(true);
      expect(tagChanges.count).toBe(2);
    });

    it("should return empty for non-existent relation", () => {
      const noChanges = changes.forRelation("nonexistent");

      expect(noChanges.isEmpty()).toBe(true);
    });

    it("should not include operations without relationField", () => {
      const tagChanges = changes.forRelation("tags");

      // The root update has no relationField
      expect(tagChanges.hasUpdates()).toBe(false);
    });
  });

  describe("getAffectedRelations", () => {
    it("should return unique relation names", () => {
      changes.addCreate("Tag", { id: "t1" }, 1, "post-1", "Post", "tags");
      changes.addCreate("Tag", { id: "t2" }, 1, "post-1", "Post", "tags");
      changes.addDelete("Comment", "c1", { id: "c1" }, 1, "comments");

      const relations = changes.getAffectedRelations();

      expect(relations).toHaveLength(2);
      expect(relations).toContain("tags");
      expect(relations).toContain("comments");
    });

    it("should not include undefined relationFields", () => {
      changes.addCreate("User", { id: "u1" }, 0);
      changes.addCreate("Tag", { id: "t1" }, 1, "post-1", "Post", "tags");

      const relations = changes.getAffectedRelations();

      expect(relations).toEqual(["tags"]);
    });

    it("should return empty array when no relations", () => {
      changes.addCreate("User", { id: "u1" }, 0);
      changes.addUpdate("User", "u1", { id: "u1" }, { name: "New" }, 0);

      const relations = changes.getAffectedRelations();

      expect(relations).toEqual([]);
    });
  });

  describe("real-world scenario: Post with Tags and Comments", () => {
    it("should correctly track N:N and 1:N changes together", () => {
      // Simulating changes to a Post aggregate:

      // 1. Adding new tags (N:N - should use connect)
      changes.addCreate(
        "Tag",
        { id: "t1", name: "TS" },
        1,
        "post-1",
        "Post",
        "tags"
      );
      changes.addCreate(
        "Tag",
        { id: "t2", name: "JS" },
        1,
        "post-1",
        "Post",
        "tags"
      );

      // 2. Removing a tag (N:N - should use disconnect)
      changes.addDelete("Tag", "t3", { id: "t3", name: "Old" }, 1, "tags");

      // 3. Adding a new comment (1:N owned - should use create)
      changes.addCreate(
        "Comment",
        { id: "c1", text: "Nice!" },
        1,
        "post-1",
        "Post",
        "comments"
      );

      // 4. Deleting a comment (1:N owned - should use delete)
      changes.addDelete("Comment", "c2", { id: "c2" }, 1, "comments");

      // 5. Updating the post itself
      changes.addUpdate(
        "Post",
        "post-1",
        { id: "post-1", title: "Updated" },
        { title: "Updated" },
        0
      );

      const batch = changes.toBatchOperations();

      // Verify grouping
      expect(batch.creates).toHaveLength(2); // tags group + comments group
      expect(batch.deletes).toHaveLength(2); // tags group + comments group
      expect(batch.updates).toHaveLength(1);

      // Tags creates
      const tagsCreates = batch.creates.find((c) => c.relationField === "tags");
      expect(tagsCreates?.items).toHaveLength(2);
      expect(tagsCreates?.entity).toBe("Tag");

      // Comments creates
      const commentsCreates = batch.creates.find(
        (c) => c.relationField === "comments"
      );
      expect(commentsCreates?.items).toHaveLength(1);
      expect(commentsCreates?.entity).toBe("Comment");

      // Tags deletes
      const tagsDeletes = batch.deletes.find((d) => d.relationField === "tags");
      expect(tagsDeletes?.ids).toEqual(["t3"]);

      // Comments deletes
      const commentsDeletes = batch.deletes.find(
        (d) => d.relationField === "comments"
      );
      expect(commentsDeletes?.ids).toEqual(["c2"]);

      // Affected relations
      expect(changes.getAffectedRelations()).toEqual(
        expect.arrayContaining(["tags", "comments"])
      );
    });
  });
});
