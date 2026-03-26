import { EntitySchemaRegistry } from "../src";

describe("EntitySchemaRegistry", () => {
  let registry: EntitySchemaRegistry;

  beforeEach(() => {
    registry = new EntitySchemaRegistry();
  });

  describe("register", () => {
    it("should register a schema", () => {
      registry.register({
        entity: "User",
        table: "users",
      });

      expect(registry.has("User")).toBe(true);
    });

    it("should allow chaining", () => {
      const result = registry
        .register({ entity: "User", table: "users" })
        .register({ entity: "Post", table: "posts" });

      expect(result).toBe(registry);
      expect(registry.has("User")).toBe(true);
      expect(registry.has("Post")).toBe(true);
    });

    it("should register with fields mapping", () => {
      registry.register({
        entity: "User",
        table: "users",
        fields: {
          email: "user_email",
          name: "user_name",
        },
      });

      expect(registry.getFieldsMap("User")).toEqual({
        email: "user_email",
        name: "user_name",
      });
    });

    it("should register with parent FK", () => {
      registry.register({
        entity: "Post",
        table: "posts",
        parentFk: {
          field: "author_id",
          parentEntity: "User",
        },
      });

      expect(registry.getParentEntity("Post")).toBe("User");
      expect(registry.getParentFkField("Post")).toBe("author_id");
    });
  });

  describe("registerAll", () => {
    it("should register multiple schemas at once", () => {
      registry.registerAll([
        { entity: "User", table: "users" },
        { entity: "Post", table: "posts" },
        { entity: "Comment", table: "comments" },
      ]);

      expect(registry.getRegisteredEntities()).toEqual([
        "User",
        "Post",
        "Comment",
      ]);
    });
  });

  describe("getSchema", () => {
    it("should return registered schema", () => {
      registry.register({
        entity: "User",
        table: "users",
        fields: { email: "user_email" },
      });

      const schema = registry.getSchema("User");

      expect(schema.entity).toBe("User");
      expect(schema.table).toBe("users");
      expect(schema.fields).toEqual({ email: "user_email" });
    });

    it("should throw for unregistered entity", () => {
      expect(() => registry.getSchema("Unknown")).toThrow(
        "No schema registered for entity 'Unknown'"
      );
    });
  });

  describe("getTable", () => {
    it("should return table name", () => {
      registry.register({ entity: "User", table: "app_users" });

      expect(registry.getTable("User")).toBe("app_users");
    });
  });

  describe("mapFieldName", () => {
    beforeEach(() => {
      registry.register({
        entity: "User",
        table: "users",
        fields: {
          email: "user_email",
          createdAt: "created_at",
        },
      });
    });

    it("should map field with different name", () => {
      expect(registry.mapFieldName("User", "email")).toBe("user_email");
      expect(registry.mapFieldName("User", "createdAt")).toBe("created_at");
    });

    it("should return original name if not mapped", () => {
      expect(registry.mapFieldName("User", "name")).toBe("name");
    });
  });

  describe("mapFields", () => {
    beforeEach(() => {
      registry.register({
        entity: "User",
        table: "users",
        fields: {
          email: "user_email",
          name: "user_name",
        },
      });
    });

    it("should map all fields", () => {
      const data = {
        email: "test@test.com",
        name: "Test User",
        age: 25,
      };

      const mapped = registry.mapFields("User", data);

      expect(mapped).toEqual({
        user_email: "test@test.com",
        user_name: "Test User",
        age: 25,
      });
    });

    it("should ignore arrays", () => {
      const data = {
        email: "test@test.com",
        posts: [{ id: "1" }, { id: "2" }],
      };

      const mapped = registry.mapFields("User", data);

      expect(mapped).toEqual({ user_email: "test@test.com" });
      expect(mapped.posts).toBeUndefined();
    });

    it("should handle null and undefined values", () => {
      const data = {
        email: null,
        name: undefined,
      };

      const mapped = registry.mapFields("User", data);

      expect(mapped.user_email).toBeNull();
      expect(mapped.user_name).toBeUndefined();
    });
  });

  describe("mapEntity", () => {
    beforeEach(() => {
      registry.register({
        entity: "User",
        table: "users",
        fields: {
          email: "user_email",
        },
      });
    });

    it("should map entity with ID", () => {
      // Mock Entity
      const mockEntity = {
        id: { value: "user-123" },
        props: {
          email: "test@test.com",
          name: "Test",
        },
      };

      const mapped = registry.mapEntity("User", mockEntity as any);

      expect(mapped).toEqual({
        id: "user-123",
        user_email: "test@test.com",
        name: "Test",
      });
    });

    it("should skip nested entities and arrays", () => {
      const mockEntity = {
        id: { value: "user-123" },
        props: {
          email: "test@test.com",
          posts: [],
          address: { id: { value: "addr-1" } },
        },
      };

      const mapped = registry.mapEntity("User", mockEntity as any);

      expect(mapped.id).toBe("user-123");
      expect(mapped.user_email).toBe("test@test.com");
      expect(mapped.posts).toBeUndefined();
      expect(mapped.address).toBeUndefined();
    });
  });

  describe("getParentFk", () => {
    beforeEach(() => {
      registry.register({
        entity: "Post",
        table: "posts",
        parentFk: {
          field: "author_id",
          parentEntity: "User",
        },
      });
      registry.register({
        entity: "User",
        table: "users",
      });
    });

    it("should return FK object", () => {
      const fk = registry.getParentFk("Post", "user-123");

      expect(fk).toEqual({ author_id: "user-123" });
    });

    it("should return null if no parent FK defined", () => {
      const fk = registry.getParentFk("User", "user-123");

      expect(fk).toBeNull();
    });
  });

  describe("getParentEntity", () => {
    it("should return parent entity name", () => {
      registry.register({
        entity: "Post",
        table: "posts",
        parentFk: { field: "author_id", parentEntity: "User" },
      });

      expect(registry.getParentEntity("Post")).toBe("User");
    });

    it("should return null if no parent", () => {
      registry.register({ entity: "User", table: "users" });

      expect(registry.getParentEntity("User")).toBeNull();
    });
  });

  describe("getRegisteredEntities", () => {
    it("should return all registered entity names", () => {
      registry
        .register({ entity: "User", table: "users" })
        .register({ entity: "Post", table: "posts" })
        .register({ entity: "Comment", table: "comments" });

      expect(registry.getRegisteredEntities()).toEqual([
        "User",
        "Post",
        "Comment",
      ]);
    });

    it("should return empty array if none registered", () => {
      expect(registry.getRegisteredEntities()).toEqual([]);
    });
  });

  describe("clear", () => {
    it("should remove all schemas", () => {
      registry
        .register({ entity: "User", table: "users" })
        .register({ entity: "Post", table: "posts" });

      registry.clear();

      expect(registry.getRegisteredEntities()).toEqual([]);
      expect(registry.has("User")).toBe(false);
    });
  });

  describe("complex scenario", () => {
    beforeEach(() => {
      registry
        .register({
          entity: "User",
          table: "users",
          fields: {
            email: "user_email",
            name: "user_name",
          },
        })
        .register({
          entity: "Post",
          table: "blog_posts",
          fields: {
            content: "post_content",
          },
          parentFk: { field: "author_id", parentEntity: "User" },
        })
        .register({
          entity: "Comment",
          table: "post_comments",
          fields: {
            text: "comment_text",
          },
          parentFk: { field: "post_id", parentEntity: "Post" },
        })
        .register({
          entity: "Like",
          table: "comment_likes",
          fields: {
            userId: "user_id",
          },
          parentFk: { field: "comment_id", parentEntity: "Comment" },
        });
    });

    it("should handle full hierarchy", () => {
      expect(registry.getTable("User")).toBe("users");
      expect(registry.getTable("Post")).toBe("blog_posts");
      expect(registry.getTable("Comment")).toBe("post_comments");
      expect(registry.getTable("Like")).toBe("comment_likes");

      expect(registry.getParentEntity("Post")).toBe("User");
      expect(registry.getParentEntity("Comment")).toBe("Post");
      expect(registry.getParentEntity("Like")).toBe("Comment");
      expect(registry.getParentEntity("User")).toBeNull();
    });

    it("should map fields correctly for each entity", () => {
      expect(registry.mapFieldName("User", "email")).toBe("user_email");
      expect(registry.mapFieldName("Post", "content")).toBe("post_content");
      expect(registry.mapFieldName("Comment", "text")).toBe("comment_text");
      expect(registry.mapFieldName("Like", "userId")).toBe("user_id");
    });

    it("should build FK chain", () => {
      expect(registry.getParentFk("Post", "user-1")).toEqual({
        author_id: "user-1",
      });
      expect(registry.getParentFk("Comment", "post-1")).toEqual({
        post_id: "post-1",
      });
      expect(registry.getParentFk("Like", "comment-1")).toEqual({
        comment_id: "comment-1",
      });
    });
  });

  describe("getRelationFieldName", () => {
    it("should return relationName when configured", () => {
      registry.register({
        entity: "User",
        table: "users",
        collections: {
          tags: { type: "reference", entity: "Tag", relationName: "user_tags" },
        },
      });

      expect(registry.getRelationFieldName("User", "tags")).toBe("user_tags");
    });

    it("should fall back to domain field name when relationName is not set", () => {
      registry.register({
        entity: "User",
        table: "users",
        collections: {
          tags: { type: "reference", entity: "Tag" },
        },
      });

      expect(registry.getRelationFieldName("User", "tags")).toBe("tags");
    });

    it("should fall back to domain field name when collection is not configured", () => {
      registry.register({ entity: "User", table: "users" });

      expect(registry.getRelationFieldName("User", "tags")).toBe("tags");
    });
  });
});
