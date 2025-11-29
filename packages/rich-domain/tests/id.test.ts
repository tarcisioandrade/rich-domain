import { Id } from "../src";
import { Address, Post, User } from "./utils";

// ============================================================================
// Id Class Tests
// ============================================================================

describe("Id Class", () => {
  describe("Construction", () => {
    it("should generate UUID when no value provided", () => {
      const id = new Id();

      expect(id.value).toBeDefined();
      expect(typeof id.value).toBe("string");
      expect(id.value.length).toBeGreaterThan(0);
      // UUID v4 format check
      expect(id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should mark as new when no value provided", () => {
      const id = new Id();

      expect(id.isNew()).toBe(true);
    });

    it("should use provided value", () => {
      const existingId = "550e8400-e29b-41d4-a716-446655440000";
      const id = new Id(existingId);

      expect(id.value).toBe(existingId);
    });

    it("should mark as NOT new when value provided", () => {
      const id = new Id("existing-id");

      expect(id.isNew()).toBe(false);
    });

    it("should generate unique IDs", () => {
      const id1 = new Id();
      const id2 = new Id();
      const id3 = new Id();

      expect(id1.value).not.toBe(id2.value);
      expect(id2.value).not.toBe(id3.value);
      expect(id1.value).not.toBe(id3.value);
    });
  });

  describe("Static Methods", () => {
    it("should create new Id with Id.create()", () => {
      const id = Id.create();

      expect(id.isNew()).toBe(true);
      expect(id.value).toBeDefined();
    });

    it("should create existing Id with Id.from()", () => {
      const id = Id.from("existing-id");

      expect(id.isNew()).toBe(false);
      expect(id.value).toBe("existing-id");
    });
  });

  describe("String Conversion", () => {
    it("should convert to string with toString()", () => {
      const id = new Id("test-id");

      expect(id.toString()).toBe("test-id");
      expect(String(id)).toBe("test-id");
    });

    it("should convert to JSON", () => {
      const id = new Id("test-id");

      expect(id.toJSON()).toBe("test-id");
      expect(JSON.stringify(id)).toBe('"test-id"');
    });
  });

  describe("Equality", () => {
    it("should compare with another Id", () => {
      const id1 = new Id("same-id");
      const id2 = new Id("same-id");
      const id3 = new Id("different-id");

      expect(id1.equals(id2)).toBe(true);
      expect(id1.equals(id3)).toBe(false);
    });

    it("should compare with string", () => {
      const id = new Id("test-id");

      expect(id.equals("test-id")).toBe(true);
      expect(id.equals("other-id")).toBe(false);
    });
  });
});

// ============================================================================
// Entity with Id Tests
// ============================================================================

describe("Entity with Id Class", () => {
  describe("New Entity", () => {
    it("should be new when Id is auto-generated", () => {
      const post = new Post({
        id: new Id(), // No value = new
        title: "New Post",
        content: "Content",
        comments: [],
        published: false,
      });

      expect(post.isNew()).toBe(true);
      expect(post.id.isNew()).toBe(true);
    });

    it("should auto-generate unique IDs", () => {
      const post1 = new Post({
        id: new Id(),
        title: "Post 1",
        comments: [],
        published: false,
        content: "Content",
      });

      const post2 = new Post({
        id: new Id(),
        title: "Post 2",
        comments: [],
        published: false,
        content: "Content",
      });

      expect(post1.id.value).not.toBe(post2.id.value);
      expect(post1.isNew()).toBe(true);
      expect(post2.isNew()).toBe(true);
    });

    it("should work with Id.create()", () => {
      const post = new Post({
        id: Id.create(),
        title: "New Post",
        content: "Content",
        comments: [],
        published: false,
      });

      expect(post.isNew()).toBe(true);
    });
  });

  describe("Existing Entity", () => {
    it("should NOT be new when Id value is provided", () => {
      const post = new Post({
        id: new Id("existing-post-id"), // Value provided = not new
        title: "Existing Post",
        content: "Content",
        comments: [],
        published: false,
      });

      expect(post.isNew()).toBe(false);
      expect(post.id.isNew()).toBe(false);
    });

    it("should work with Id.from()", () => {
      const post = new Post({
        id: Id.from("existing-post-id"),
        title: "Existing Post",
        content: "Content",
        comments: [],
        published: false,
      });

      expect(post.isNew()).toBe(false);
    });
  });

  describe("toJson()", () => {
    it("should serialize Id to string", () => {
      const post = new Post({
        id: new Id("post-123"),
        title: "Test Post",
        comments: [],
        published: false,
        content: "Content",
      });

      const json = post.toJson();

      expect(json.id).toBe("post-123");
      expect(typeof json.id).toBe("string");
    });
  });

  describe("Id Comparison in Arrays", () => {
    it("should detect changes in arrays using Id", () => {
      const user = new User({
        id: new Id("user-1"),
        name: "John",
        email: "john@example.com",
        posts: [],
        address: new Address({
          street: "Main St",
          city: "NYC",
        }),
        tags: [],
      });

      user.addManyPosts([
        new Post({
          id: new Id(),
          title: "Post 1",
          content: "Content 1",
          comments: [],
          published: false,
        }),
        new Post({
          id: new Id(),
          title: "Post 2",
          content: "Content 2",
          comments: [],
          published: false,
        }),
      ]);

      const changes = user.getTypedChanges();

      console.dir(changes.creates(), { depth: null });

      expect(changes.creates().length).toBe(2);
    });

    it("should track deletes correctly with Id", () => {
      const postId = new Id("post-to-delete");

      const user = new User({
        id: new Id("user-1"),
        name: "John",
        email: "john@example.com",
        posts: [
          new Post({
            id: postId,
            title: "Post 1",
            content: "Content 1",
            comments: [],
            published: false,
          }),
        ],
        address: new Address({
          street: "Main St",
          city: "NYC",
        }),
        tags: [],
      });

      user.removePost(postId);

      const changes = user.getTypedChanges();

      expect(changes.deletes()).toHaveLength(1);
      expect(changes.creates()).toHaveLength(0);
      expect(changes.deletes()[0].id).toBe(postId.value);
    });
  });
});

// ============================================================================
// Aggregate with Id Tests
// ============================================================================

describe("Aggregate with Id Class", () => {
  it("should be new when Id is auto-generated", () => {
    const user = new User({
      id: new Id(),
      name: "John",
      email: "john@example.com",
      posts: [],
      address: new Address({
        street: "Main St",
        city: "NYC",
      }),
      tags: [],
    });

    expect(user.isNew()).toBe(true);
  });

  it("should NOT be new when Id value is provided", () => {
    const user = new User({
      id: new Id("existing-user"),
      name: "John",
      email: "john@example.com",
      posts: [],
      address: new Address({
        street: "Main St",
        city: "NYC",
      }),
      tags: [],
    });

    expect(user.isNew()).toBe(false);
  });

  it("should serialize Id in nested entities", () => {
    const user = new User({
      id: new Id("user-1"),
      name: "John",
      email: "john@example.com",
      posts: [
        new Post({
          id: new Id("post-1"),
          title: "Post 1",
          comments: [],
          content: "Content",
          published: false,
        }),
      ],
      tags: [],
      address: new Address({
        street: "Main St",
        city: "NYC",
      }),
    });

    const json = user.toJson();

    expect(json.id).toBe("user-1");
    expect(json.posts[0].id).toBe("post-1");
    expect(typeof json.id).toBe("string");
    expect(typeof json.posts[0].id).toBe("string");
  });
});
