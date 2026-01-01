import { Email } from "./utils";

describe("Value Object", () => {
  it("should create immutable value object", () => {
    const email = new Email("test@example.com");

    expect(email.value).toBe("test@example.com");
  });

  it("should compare value objects by value", () => {
    const email1 = new Email("test@example.com");
    const email2 = new Email("test@example.com");
    const email3 = new Email("test2@example.com");

    expect(email1.equals(email2)).toBe(true);
    expect(email1.equals(email3)).toBe(false);
  });

  describe("Value Object", () => {
    it("should be immutable", () => {
      const email = new Email("test@example.com");

      expect(email.value).toBe("test@example.com");
      expect(() => {
        (email as any).value = "test2@example.com";
      }).toThrow();
    });

    it("should compare by value", () => {
      const email1 = new Email("test@example.com");
      const email2 = new Email("test@example.com");
      const email3 = new Email("test2@example.com");

      expect(email1.equals(email2)).toBe(true);
      expect(email1.equals(email3)).toBe(false);
    });
  });
});
