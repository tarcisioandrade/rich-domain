import { TagReference } from "./utils";

describe("Value Object", () => {
  it("should create immutable value object", () => {
    const tag = new TagReference({
      tagId: "1",
      name: "Tag 1",
    });

    expect(tag.tagId).toBe("1");
    expect(tag.name).toBe("Tag 1");
  });

  it("should compare value objects by value", () => {
    const tag1 = new TagReference({
      tagId: "1",
      name: "Tag 1",
    });

    const tag2 = new TagReference({
      tagId: "1",
      name: "Tag 1",
    });

    const tag3 = new TagReference({
      tagId: "2",
      name: "Tag 2",
    });

    expect(tag1.equals(tag2)).toBe(true);
    expect(tag1.equals(tag3)).toBe(false);
  });

  it("should convert value object to JSON", () => {
    const tag = new TagReference({
      name: "Tag 1",
      tagId: "1",
    });

    const json = tag.toJSON();
    expect(json).toEqual({
      name: "Tag 1",
      tagId: "1",
    });
  });

  describe("Value Object", () => {
    it("should be immutable", () => {
      const tag = new TagReference({
        tagId: "1",
        name: "Tag 1",
      });

      expect(tag.tagId).toBe("1");
      expect(() => {
        (tag as any).props.tagId = "2";
      }).toThrow();
    });

    it("should compare by value", () => {
      const tag1 = new TagReference({
        tagId: "1",
        name: "Tag 1",
      });

      const tag2 = new TagReference({
        tagId: "1",
        name: "Tag 1",
      });

      const tag3 = new TagReference({
        tagId: "2",
        name: "Tag 2",
      });

      expect(tag1.equals(tag2)).toBe(true);
      expect(tag1.equals(tag3)).toBe(false);
    });
  });
});
