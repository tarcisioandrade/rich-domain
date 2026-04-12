import { DomainError, EntityValidation } from "../src";
import { Aggregate, Entity, Id } from "../src/core/index";
import {
  Post,
  TagReference,
  User,
  Like,
  Address,
  Comment,
  Email,
} from "./utils";
import { z } from "zod";

function createUser(
  overrides: Partial<{
    name: string;
    email: Email;
    address: Address | null;
    posts: Post[];
    tags: TagReference[];
  }> = {}
) {
  const user = new User({
    id: new Id("user-1"),
    name: overrides.name ?? "Test User",
    email: overrides.email ?? new Email("test@test.com"),
    address: overrides.address ?? null,
    posts: overrides.posts ?? [],
    tags: overrides.tags ?? [],
  });

  return user;
}

function createPost(
  overrides: Partial<{
    title: string;
    content: string;
    published: boolean;
    comments: Comment[];
  }> = {}
): Post {
  return new Post({
    id: new Id(),
    title: overrides.title ?? "Test Post",
    content: overrides.content ?? "Test content",
    published: overrides.published ?? false,
    comments: overrides.comments ?? [],
  });
}

function createComment(
  overrides: Partial<{
    text: string;
    authorId: string;
    likes: Like[];
  }> = {}
): Comment {
  return new Comment({
    id: new Id(),
    text: overrides.text ?? "Test comment",
    authorId: overrides.authorId ?? "author-1",
    likes: overrides.likes ?? [],
  });
}

function createAddress(street = "123 Main St", city = "Test City"): Address {
  return new Address({
    id: new Id(),
    street,
    city,
  });
}

describe("ChangeTracker.getChanges()", () => {
  describe("no changes", () => {
    it("should return empty changes when nothing modified", () => {
      const user = createUser();

      const changes = user.getChanges();

      expect(changes.isEmpty()).toBe(true);
      expect(changes.hasCreates()).toBe(false);
      expect(changes.hasUpdates()).toBe(false);
      expect(changes.hasDeletes()).toBe(false);
    });
  });

  describe("root property changes", () => {
    it("should detect circular references", () => {
      class CircularReference extends Aggregate<{
        id: Id;
        circularReference: CircularReference | null;
      }> {
        protected static validation: EntityValidation<{
          id: Id;
          circularReference: CircularReference | null;
        }> = {
          schema: z.object({
            id: z.custom<Id>(),
            circularReference: z.custom<CircularReference>().nullable(),
          }),
        };

        addCircularReference(circularReference: CircularReference) {
          this.props.circularReference = circularReference;
        }
      }

      const circularReference = new CircularReference({
        id: new Id(),
        circularReference: null,
      });
      circularReference.addCircularReference(circularReference);

      expect(() => {
        circularReference.getChanges();
      }).toThrow(DomainError);
    });

    it("should detect primitive property changes", () => {
      const user = createUser();

      user.changeName("New Name");
      user.changeEmail("new@email.com");

      const changes = user.getTypedChanges();

      expect(changes.hasUpdates()).toBe(true);

      const userUpdates = changes.of("User");
      expect(userUpdates.hasUpdates()).toBe(true);
      expect(userUpdates.updates[0].changed).toMatchObject({
        name: "New Name",
        email: "new@email.com",
      });
    });
  });

  describe("collection changes (1:N)", () => {
    it("should detect added items", () => {
      const user = createUser();
      const newPost = createPost({ title: "New Post" });

      user.addPost(newPost);

      const changes = user.getTypedChanges();

      expect(changes.hasCreates()).toBe(true);

      const postChanges = changes.of("Post");

      expect(postChanges.hasCreates()).toBe(true);
      expect(postChanges.creates).toHaveLength(1);
      expect(postChanges.creates[0].title).toBe("New Post");
    });

    it("should detect removed items", () => {
      const existingPost = new Post({
        id: new Id(),
        title: "Existing Post",
        content: "Existing content",
        published: false,
        comments: [],
      });
      const user = new User({
        id: new Id(),
        name: "Test User",
        email: new Email("test@test.com"),
        address: null,
        posts: [existingPost],
        tags: [],
      });

      user.removePost(existingPost.id);

      const changes = user.getChanges();

      expect(changes.hasDeletes()).toBe(true);

      const postChanges = changes.of("Post");
      expect(postChanges.hasDeletes()).toBe(true);
      expect(postChanges.deletes.length).toBe(1);
    });

    it("should detect updated items", () => {
      const existingPost = createPost({ title: "Original Title" });
      const user = createUser({ posts: [existingPost] });

      user.posts[0].changeTitle("Updated Title");

      const changes = user.getTypedChanges();

      const postChanges = changes.of("Post");
      expect(postChanges.hasUpdates()).toBe(true);
      expect(postChanges.updates[0].changed).toMatchObject({
        title: "Updated Title",
      });
    });

    it("should detect multiple operations", () => {
      const post1 = createPost({ title: "Post 1" });
      const post2 = createPost({ title: "Post 2" });
      const user = createUser({ posts: [post1, post2] });

      // Remove post1
      user.removePost(post1.id);

      // Add new post
      const post3 = createPost({ title: "Post 3" });
      user.addPost(post3);

      // Update post2
      user.posts[0].changeTitle("Post 2 Updated");

      const changes = user.getTypedChanges();
      const postChanges = changes.of("Post");

      expect(postChanges.hasCreates()).toBe(true);
      expect(postChanges.hasUpdates()).toBe(true);
      expect(postChanges.hasDeletes()).toBe(true);
      expect(postChanges.creates).toHaveLength(1);
      expect(postChanges.updates).toHaveLength(1);
      expect(postChanges.deletes).toHaveLength(1);
    });
  });

  describe("nested collections", () => {
    it("should detect changes in deeply nested collections", () => {
      const comment = createComment({ text: "Original comment" });
      const post = createPost({ comments: [comment] });
      const user = createUser({ posts: [post] });

      // Add new comment
      const newComment = createComment({ text: "New comment" });
      user.posts[0].addComment(newComment);

      const changes = user.getTypedChanges();
      const commentChanges = changes.of("Comment");

      expect(commentChanges.hasCreates()).toBe(true);
      expect(commentChanges.creates[0].text).toBe("New comment");
      expect(commentChanges.updates).toHaveLength(0);
      expect(commentChanges.deletes).toHaveLength(0);
      expect(commentChanges.creates).toHaveLength(1);
    });

    it("should handle 3+ levels of nesting (User > Post > Comment > Like)", () => {
      const comment = createComment({ likes: [] });
      const post = createPost({ comments: [comment] });
      const user = createUser({ posts: [post] });

      const newLike = new Like({
        postId: "post-1",
        userId: "user-2",
        createdAt: new Date(),
      });
      user.posts[0].comments[0].addLike(newLike);

      const changes = user.getTypedChanges();
      const likeChanges = changes.of("Like");

      expect(likeChanges.hasCreates()).toBe(true);
      expect(likeChanges.creates).toHaveLength(1);
      expect(likeChanges.updates).toHaveLength(0);
      expect(likeChanges.deletes).toHaveLength(0);
    });
  });

  describe("entity relations (1:1)", () => {
    it("should detect created entity (null → Entity)", () => {
      const user = createUser({ address: null });

      user.setAddress(createAddress("New Street", "New City"));

      const changes = user.getTypedChanges();
      const addressChanges = changes.of("Address");

      expect(addressChanges.hasCreates()).toBe(true);
      expect(addressChanges.creates[0].street).toBe("New Street");
    });

    it("should detect deleted entity (Entity → null)", () => {
      const address = createAddress();
      const user = createUser({ address });

      user.removeAddress();

      const changes = user.getTypedChanges();
      const addressChanges = changes.of("Address");

      expect(addressChanges.hasDeletes()).toBe(true);
      expect(addressChanges.deletes).toHaveLength(1);
    });

    it("should detect updated entity (same ID with changes)", () => {
      const address = createAddress("Old Street", "Old City");
      const user = createUser({ address });

      user.address?.changeStreet("New Street");

      const changes = user.getTypedChanges();
      const addressChanges = changes.of("Address");

      expect(addressChanges.hasUpdates()).toBe(true);
      expect(addressChanges.updates[0].changed).toMatchObject({
        street: "New Street",
      });
    });

    it("should detect replaced entity (different ID)", () => {
      const oldAddress = createAddress("Old Street", "Old City");
      const user = createUser({ address: oldAddress });

      const newAddress = createAddress("New Street", "New City");
      user.setAddress(newAddress);

      const changes = user.getTypedChanges();
      const addressChanges = changes.of("Address");

      expect(addressChanges.hasDeletes()).toBe(true);
      expect(addressChanges.hasCreates()).toBe(true);
      expect(addressChanges.deletes).toHaveLength(1);
      expect(addressChanges.deletes[0].id.value).toBe(oldAddress.id.value);
      expect(addressChanges.creates).toHaveLength(1);
      expect(addressChanges.creates[0].id.value).toBe(newAddress.id.value);
    });
  });

  describe("Value Objects with identityKey", () => {
    it("should detect added VOs using identityKey", () => {
      const user = createUser({ tags: [] });

      const tag = new TagReference({ tagId: "tag-1", name: "JavaScript" });
      user.addTag(tag);

      const changes = user.getTypedChanges();
      const tagChanges = changes.of("TagReference");

      expect(tagChanges.hasCreates()).toBe(true);
      expect(tagChanges.creates).toHaveLength(1);
      expect(tagChanges.creates[0].tagId).toBe("tag-1");
    });

    it("should detect removed VOs using identityKey", () => {
      const tag = new TagReference({ tagId: "tag-1", name: "JavaScript" });
      const user = createUser({ tags: [tag] });

      user.removeTag(tag.tagId);

      const changes = user.getTypedChanges();
      const tagChanges = changes.of("TagReference");

      expect(tagChanges.hasDeletes()).toBe(true);
      expect(tagChanges.deletes).toHaveLength(1);
      expect(tagChanges.deletes[0].tagId).toBe("tag-1");
    });

    it("should use composite identityKey for Likes", () => {
      const like = new Like({
        postId: "post-1",
        userId: "user-1",
        createdAt: new Date(),
      });
      const comment = createComment({ likes: [like] });
      const post = createPost({ comments: [comment] });
      const user = createUser({ posts: [post] });

      user.posts[0].comments[0].removeLike(like.postId, like.userId);

      const changes = user.getTypedChanges();
      const likeChanges = changes.of("Like");

      expect(likeChanges.hasDeletes()).toBe(true);
      expect(likeChanges.deletes).toHaveLength(1);
      expect(likeChanges.deletes[0].postId).toBe("post-1");
      expect(likeChanges.deletes[0].userId).toBe("user-1");
    });
  });

  describe("toBatchOperations", () => {
    it("should group and order operations correctly", () => {
      const comment = createComment();
      const post = createPost({ comments: [comment] });
      const address = createAddress();
      const user = createUser({ posts: [post], address });

      user.changeName("New Name"); // depth 0
      user.address?.changeStreet("New Street"); // depth 1
      user.posts[0].changeTitle("New Title"); // depth 1
      user.posts[0].comments[0].changeText("New Comment"); // depth 2

      const newPost = createPost({ title: "Brand New Post" });
      user.addPost(newPost);

      const changes = user.getTypedChanges();
      const batch = changes.toBatchOperations();

      expect(batch.deletes).toHaveLength(0);

      expect(batch.creates.length).toBe(1);
      expect(batch.creates[0].entity).toBe("Post");
      expect(batch.creates[0].depth).toBe(1);

      expect(batch.updates.length).toBe(4);
    });

    it("should order deletes by depth DESC (leaf → root)", () => {
      const like = new Like({
        postId: "post-1",
        userId: "user-1",
        createdAt: new Date(),
      });
      const comment = createComment({ likes: [like] });
      const post = createPost({ comments: [comment] });
      const user = createUser({ posts: [post] });

      user.posts[0].comments[0].removeLike(like.postId, like.userId);
      user.posts[0].comments = [];
      user.posts = [];

      const changes = user.getChanges();
      const batch = changes.toBatchOperations();

      // Like (depth 3) → Comment (depth 2) → Post (depth 1)
      const likeIdx = batch.deletes.findIndex((d) => d.entity === "Like");
      const commentIdx = batch.deletes.findIndex((d) => d.entity === "Comment");
      const postIdx = batch.deletes.findIndex((d) => d.entity === "Post");

      expect(batch.deletes).toHaveLength(3);
      expect(likeIdx).toBeLessThan(commentIdx);
      expect(commentIdx).toBeLessThan(postIdx);
    });

    it("should order creates by depth ASC (root → leaf)", () => {
      const user = createUser();

      const newComment = createComment({ text: "New Comment" });
      const newPost = createPost({ title: "New Post" });
      user.addPost(newPost);
      user.posts[0].addComment(newComment);

      const changes = user.getTypedChanges();
      const batch = changes.toBatchOperations();

      const postIdx = batch.creates.findIndex((c) => c.entity === "Post");
      const commentIdx = batch.creates.findIndex((c) => c.entity === "Comment");

      expect(batch.creates.length).toBe(2);
      expect(batch.creates[0].entity).toBe("Post");
      expect(batch.creates[0].depth).toBe(1);
      expect(batch.creates[1].entity).toBe("Comment");
      expect(batch.creates[1].depth).toBe(2);
      expect(postIdx).toBeLessThan(commentIdx);
    });
  });

  describe("markAsClean", () => {
    it("should reset changes after clearHistory", () => {
      const user = createUser();

      user.changeName("Changed Name");

      expect(user.getChanges().hasChanges()).toBe(true);

      user.markAsClean();

      expect(user.getChanges().isEmpty()).toBe(true);
    });

    it("should reset changes after markAsClean", () => {
      const user = createUser();

      user.changeName("Changed Name");
      user.markAsClean();

      expect(user.getChanges().isEmpty()).toBe(true);
    });
  });
});

describe("Primitive Arrays", () => {
  const TestStringSchema = z.object({
    id: z.custom<Id>(),
    name: z.string(),
    strings: z.array(z.string()),
  });
  class TestString extends Aggregate<z.infer<typeof TestStringSchema>> {
    protected static validation: EntityValidation<
      z.infer<typeof TestStringSchema>
    > = {
      schema: TestStringSchema,
    };
  }

  it("should not track primitive array items as individual creates on instantiation", () => {
    const test = new TestString({
      id: new Id("121212121"),
      name: "Test User",
      strings: ["Teste 1", "Teste 2", "Teste 3"],
    });

    const changes = test.getChanges();

    // Should be empty - no changes detected on initial instantiation
    expect(changes.isEmpty()).toBe(true);
    expect(changes.creates().length).toBe(0);
  });

  it("should detect primitive array changes as property update", () => {
    const test = new TestString({
      id: new Id("121212121"),
      name: "Test User",
      strings: ["Teste 1", "Teste 2", "Teste 3"],
    });

    // Simulate data from database (clear initial state)
    test.markAsClean();

    // Now modify the array
    test.props.strings.push("Teste 4");

    const changes = test.getChanges();

    expect(changes.isEmpty()).toBe(false);
    expect(changes.hasUpdates()).toBe(true);

    const updates = changes.updates();
    expect(updates.length).toBe(1);
    expect(updates[0].entity).toBe("TestString");
    expect(updates[0].changedFields).toHaveProperty("strings");
    expect(updates[0].changedFields.strings).toEqual([
      "Teste 1",
      "Teste 2",
      "Teste 3",
      "Teste 4",
    ]);
  });

  it("should detect primitive array removal as property update", () => {
    const test = new TestString({
      id: new Id("121212121"),
      name: "Test User",
      strings: ["Teste 1", "Teste 2", "Teste 3"],
    });

    test.markAsClean();

    // Remove an item by replacing the array
    test.props.strings = test.props.strings.filter((_, i) => i !== 1);

    const changes = test.getChanges();

    expect(changes.hasUpdates()).toBe(true);
    const updates = changes.updates();
    expect(updates[0].changedFields.strings).toEqual(["Teste 1", "Teste 3"]);
  });

  it("should detect primitive array replacement as property update", () => {
    const test = new TestString({
      id: new Id("121212121"),
      name: "Test User",
      strings: ["Teste 1", "Teste 2", "Teste 3"],
    });

    test.markAsClean();

    // Replace entire array
    test.props.strings = ["New 1", "New 2"];

    const changes = test.getChanges();

    expect(changes.hasUpdates()).toBe(true);
    const updates = changes.updates();
    expect(updates[0].changedFields.strings).toEqual(["New 1", "New 2"]);
  });
});

describe("Recursive markAsClean and markAsPersisted", () => {
  it("markAsClean should recursively clean nested entities", () => {
    const comment = createComment({ text: "Original comment" });
    const post = createPost({
      title: "Original title",
      comments: [comment],
    });
    const user = createUser({ posts: [post] });

    // Make changes at all levels
    user.props.name = "Changed Name";
    post.props.title = "Changed Title";
    comment.props.text = "Changed Comment";

    // Verify changes exist at all levels
    expect(user.getChanges().hasUpdates()).toBe(true);
    expect(post.getChanges().hasUpdates()).toBe(true);
    expect(comment.getChanges().hasUpdates()).toBe(true);

    // Mark root as clean - should propagate to all nested entities
    user.markAsClean();

    // All entities should now be clean
    expect(user.getChanges().isEmpty()).toBe(true);
    expect(post.getChanges().isEmpty()).toBe(true);
    expect(comment.getChanges().isEmpty()).toBe(true);
  });

  it("markAsPersisted should recursively mark all nested entity Ids as not new", () => {
    const comment = createComment();
    const post = createPost({ comments: [comment] });
    const user = new User({
      id: new Id(), // New ID (isNew = true)
      name: "Test User",
      email: new Email("test@test.com"),
      address: null,
      posts: [post],
      tags: [],
    });

    // All Ids should be new initially
    expect(user.id.isNew()).toBe(true);
    expect(post.id.isNew()).toBe(true);
    expect(comment.id.isNew()).toBe(true);

    // Mark root as persisted - should propagate to all nested entities
    user.markAsPersisted();

    // All Ids should now be marked as not new
    expect(user.id.isNew()).toBe(false);
    expect(post.id.isNew()).toBe(false);
    expect(comment.id.isNew()).toBe(false);
  });

  it("markAsPersisted should also clean changes in nested entities", () => {
    const comment = createComment({ text: "Original" });
    const post = createPost({ comments: [comment] });
    const user = new User({
      id: new Id(),
      name: "Test User",
      email: new Email("test@test.com"),
      address: null,
      posts: [post],
      tags: [],
    });

    // Make changes
    user.props.name = "Changed";
    post.props.title = "Changed";
    comment.props.text = "Changed";

    // Verify changes exist
    expect(user.getChanges().hasChanges()).toBe(true);

    // Mark as persisted
    user.markAsPersisted();

    // All should be clean
    expect(user.getChanges().isEmpty()).toBe(true);
    expect(post.getChanges().isEmpty()).toBe(true);
    expect(comment.getChanges().isEmpty()).toBe(true);

    // And all Ids should be not new
    expect(user.id.isNew()).toBe(false);
    expect(post.id.isNew()).toBe(false);
    expect(comment.id.isNew()).toBe(false);
  });

  it("markAsClean should work with single nested entity (1:1 relation)", () => {
    const address = createAddress("Original St", "Original City");
    const user = createUser({ address });

    // Make changes
    address.props.street = "Changed St";

    expect(address.getChanges().hasUpdates()).toBe(true);

    // Mark user as clean
    user.markAsClean();

    // Address should also be clean
    expect(address.getChanges().isEmpty()).toBe(true);
  });
});

describe("splice() on Zod-validated collection", () => {
  const ItemSchema = z.object({ id: z.custom<Id>() });

  class Item extends Entity<z.infer<typeof ItemSchema>> {}

  const CollectionSchema = z.object({
    id: z.custom<Id>(),
    items: z.array(z.instanceof(Item)),
  });

  class CollectionAggregate extends Aggregate<
    z.infer<typeof CollectionSchema>
  > {
    protected static validation: EntityValidation<
      z.infer<typeof CollectionSchema>
    > = {
      schema: CollectionSchema,
    };

    get items() {
      return this.props.items;
    }
  }

  it("should not throw when splice() removes an item from a Zod-validated collection", () => {
    const item1 = new Item({ id: new Id("item-1") });
    const item2 = new Item({ id: new Id("item-2") });
    const agg = new CollectionAggregate({
      id: new Id("agg-1"),
      items: [item1, item2],
    });
    agg.markAsClean();

    expect(() => {
      agg.props.items.splice(0, 1);
    }).not.toThrow();

    expect(agg.props.items).toHaveLength(1);
    expect(agg.props.items[0].id.value).toBe("item-2");
  });

  it("should track splice() removal as a delete in AggregateChanges", () => {
    const item1 = new Item({ id: new Id("item-1") });
    const item2 = new Item({ id: new Id("item-2") });
    const agg = new CollectionAggregate({
      id: new Id("agg-1"),
      items: [item1, item2],
    });
    agg.markAsClean();

    agg.props.items.splice(0, 1);

    const changes = agg.getChanges();

    expect(changes.hasDeletes()).toBe(true);
    const deletes = changes.deletes();
    expect(deletes).toHaveLength(1);
    expect(deletes[0].id).toBe("item-1");
  });
});
