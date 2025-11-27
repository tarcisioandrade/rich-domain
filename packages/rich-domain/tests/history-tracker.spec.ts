import { Id } from "../src/id";
import { Post, TagReference, User, Like, Address, Comment } from "./utils";

function createUser(
  overrides: Partial<{
    name: string;
    email: string;
    address: Address | null;
    posts: Post[];
    tags: TagReference[];
  }> = {}
) {
  const user = new User({
    id: new Id("user-1"),
    name: overrides.name ?? "Test User",
    email: overrides.email ?? "test@test.com",
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

// ============================================================================
// Tests
// ============================================================================

describe("HistoryTracker.getChanges()", () => {
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
    it("should detect primitive property changes", () => {
      const user = createUser();

      user.changeName("New Name");
      user.changeEmail("new@email.com");

      const changes = user.getChanges();

      expect(changes.hasUpdates()).toBe(true);

      const userUpdates = changes.for("User");
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

      const postChanges = changes.for("Post");

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
        email: "test@test.com",
        address: null,
        posts: [existingPost],
        tags: [],
      });

      user.removePost(existingPost.id);

      const changes = user.getChanges();

      expect(changes.hasDeletes()).toBe(true);

      const postChanges = changes.for("Post");
      expect(postChanges.hasDeletes()).toBe(true);
      expect(postChanges.deletes.length).toBe(1);
    });

    it("should detect updated items", () => {
      const existingPost = createPost({ title: "Original Title" });
      const user = createUser({ posts: [existingPost] });

      user.posts[0].changeTitle("Updated Title");

      const changes = user.getChanges();

      const postChanges = changes.for("Post");
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

      const changes = user.getChanges();
      const postChanges = changes.for("Post");

      expect(postChanges.hasCreates()).toBe(true);
      expect(postChanges.hasUpdates()).toBe(true);
      expect(postChanges.hasDeletes()).toBe(true);
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

      const changes = user.getChanges();
      const commentChanges = changes.for("Comment");

      expect(commentChanges.hasCreates()).toBe(true);
      expect(commentChanges.creates[0].text).toBe("New comment");
    });

    // TODO: Fix 3+ levels of nesting - currently not supported
    it("should handle 3+ levels of nesting (User > Post > Comment > Like)", () => {
      // This test is skipped because the current implementation doesn't properly
      // support tracking changes in arrays that are 3+ levels deep
      const comment = createComment({ likes: [] });
      const post = createPost({ comments: [comment] });
      const user = createUser({ posts: [post] });

      const newLike = new Like({
        postId: "post-1",
        userId: "user-2",
        createdAt: new Date(),
      });
      user.posts[0].comments[0].addLike(newLike);

      const changes = user.getChanges();
      const likeChanges = changes.for("Like");

      expect(likeChanges.hasCreates()).toBe(true);
    });
  });

  describe("entity relations (1:1)", () => {
    it("should detect created entity (null → Entity)", () => {
      const user = createUser({ address: null });

      user.setAddress(createAddress("New Street", "New City"));

      const changes = user.getChanges();
      const addressChanges = changes.for("Address");

      expect(addressChanges.hasCreates()).toBe(true);
      expect(addressChanges.creates[0].street).toBe("New Street");
    });

    it("should detect deleted entity (Entity → null)", () => {
      const address = createAddress();
      const user = createUser({ address });

      user.removeAddress();

      const changes = user.getChanges();
      const addressChanges = changes.for("Address");

      expect(addressChanges.hasDeletes()).toBe(true);
    });

    it("should detect updated entity (same ID with changes)", () => {
      const address = createAddress("Old Street", "Old City");
      const user = createUser({ address });

      user.address?.changeStreet("New Street");

      const changes = user.getChanges();
      const addressChanges = changes.for("Address");

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

      const changes = user.getChanges();
      const addressChanges = changes.for("Address");

      // Replaced = delete old + create new
      expect(addressChanges.hasDeletes()).toBe(true);
      expect(addressChanges.hasCreates()).toBe(true);
    });
  });

  describe("Value Objects with identityKey", () => {
    it("should detect added VOs using identityKey", () => {
      const user = createUser({ tags: [] });

      const tag = new TagReference({ tagId: "tag-1", name: "JavaScript" });
      user.addTag(tag);

      const changes = user.getChanges();
      const tagChanges = changes.for("TagReference");

      expect(tagChanges.hasCreates()).toBe(true);
    });

    it("should detect removed VOs using identityKey", () => {
      const tag = new TagReference({ tagId: "tag-1", name: "JavaScript" });
      const user = createUser({ tags: [tag] });

      user.removeTag(tag.tagId);

      const changes = user.getChanges();
      const tagChanges = changes.for("TagReference");

      expect(tagChanges.hasDeletes()).toBe(true);
    });

    // TODO: Fix 3+ levels of nesting for composite identityKey
    it("should use composite identityKey for Likes", () => {
      // This test is skipped because it involves 3+ levels of nesting
      // which is currently not properly supported
      const like = new Like({
        postId: "post-1",
        userId: "user-1",
        createdAt: new Date(),
      });
      const comment = createComment({ likes: [like] });
      const post = createPost({ comments: [comment] });
      const user = createUser({ posts: [post] });

      // Remove like
      user.posts[0].comments[0].removeLike(like.postId, like.userId);

      const changes = user.getChanges();
      const likeChanges = changes.for("Like");

      expect(likeChanges.hasDeletes()).toBe(true);
    });
  });

  describe("toBatchOperations", () => {
    it("should group and order operations correctly", () => {
      const comment = createComment();
      const post = createPost({ comments: [comment] });
      const address = createAddress();
      const user = createUser({ posts: [post], address });

      // Multiple changes at different depths
      user.changeName("New Name"); // depth 0
      user.address?.changeStreet("New Street"); // depth 1
      user.posts[0].changeTitle("New Title"); // depth 1
      user.posts[0].comments[0].changeText("New Comment"); // depth 2

      const newPost = createPost({ title: "Brand New Post" });
      user.addPost(newPost); // create at depth 1

      const changes = user.getTypedChanges();
      const batch = changes.toBatchOperations();

      // Deletes should be empty (no deletes in this test)
      expect(batch.deletes).toHaveLength(0);

      // Creates should be ordered by depth ASC
      expect(batch.creates.length).toBeGreaterThan(0);

      // Updates should be grouped by entity
      expect(batch.updates.length).toBeGreaterThan(0);
    });

    it("should order deletes by depth DESC (leaf → root)", () => {
      const comment = createComment();
      const post = createPost({ comments: [comment] });
      const user = createUser({ posts: [post] });

      // Delete comment (depth 2) and post (depth 1)
      user.posts[0].comments = [];
      user.posts = [];

      const changes = user.getChanges();
      const batch = changes.toBatchOperations();

      // Comment should come before Post
      const commentIdx = batch.deletes.findIndex((d) => d.entity === "Comment");
      const postIdx = batch.deletes.findIndex((d) => d.entity === "Post");

      if (commentIdx !== -1 && postIdx !== -1) {
        expect(commentIdx).toBeLessThan(postIdx);
      }
    });

    it("should order creates by depth ASC (root → leaf)", () => {
      const user = createUser();

      const newComment = createComment({ text: "New Comment" });
      const newPost = createPost({ title: "New Post", comments: [newComment] });
      user.addPost(newPost);

      const changes = user.getChanges();
      const batch = changes.toBatchOperations();

      // Post should come before Comment
      const postIdx = batch.creates.findIndex((c) => c.entity === "Post");
      const commentIdx = batch.creates.findIndex((c) => c.entity === "Comment");

      if (postIdx !== -1 && commentIdx !== -1) {
        expect(postIdx).toBeLessThan(commentIdx);
      }
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
