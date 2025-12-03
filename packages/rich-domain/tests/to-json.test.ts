import { Entity, Id } from "../src";
import { Post, User, Address } from "./utils";

describe("toJSON Functionality", () => {
  it("should convert simple entity to JSON", () => {
    const post = new Post({
      id: new Id("1"),
      title: "First Post",
      content: "Hello World",
      published: false,
      comments: [],
    });

    const json = post.toJSON();
    expect(json).toEqual({
      id: "1",
      title: "First Post",
      content: "Hello World",
      published: false,
      comments: [],
    });
  });

  it("should convert nested entities to JSON", () => {
    const user = new User({
      id: new Id("1"),
      name: "John Doe",
      email: "john@example.com",
      posts: [
        new Post({
          id: new Id("1"),
          title: "Post 1",
          content: "Content 1",
          published: false,
          comments: [],
        }),
        new Post({
          id: new Id("2"),
          title: "Post 2",
          content: "Content 2",
          published: false,
          comments: [],
        }),
      ],
      address: new Address({
        street: "Main St",
        city: "NYC",
      }),
      tags: [],
    });

    const json = user.toJSON();

    expect(json.id).toBe("1");
    expect(json.name).toBe("John Doe");
    expect(json.posts).toHaveLength(2);
    expect(json.posts[0].title).toBe("Post 1");
    expect(json.address?.city).toBe("NYC");
  });

  it("should handle deeply nested structures", () => {
    const user = new User({
      id: new Id("1"),
      name: "John Doe",
      email: "john@example.com",
      posts: [
        new Post({
          id: new Id("1"),
          title: "Post 1",
          content: "Content 1",
          published: false,
          comments: [],
        }),
      ],
      address: new Address({
        street: "Main St",
        city: "NYC",
      }),
      tags: [],
    });

    const json = user.toJSON();
    expect(typeof json).toBe("object");
    expect(Array.isArray(json.posts)).toBe(true);
    expect(json.posts[0].id).toBe("1");
  });

  it("should serialize date correctly", () => {
    class Test extends Entity<{ id: Id; createdAt: Date }> {}

    const test = new Test({
      id: new Id("1"),
      createdAt: new Date(),
    });

    const json = test.toJSON();
    expect(json.createdAt).toBe(test.props.createdAt.toISOString());
  });
});
