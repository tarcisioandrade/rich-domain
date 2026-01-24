import { z } from "zod";
import { ValueObject, ValidationError, throwValidationError } from "../src";
import { VOHooks, VOValidation } from "../src/types";

const emailSchema = z.string().email("Invalid email format");
type EmailProps = z.infer<typeof emailSchema>;

class Email extends ValueObject<EmailProps> {
  protected static validation: VOValidation<EmailProps> = {
    schema: emailSchema,
    config: {
      onCreate: true,
      throwOnError: true,
    },
  };
}

const moneySchema = z.number().min(0, "Amount must be non-negative");
class Money extends ValueObject<number> {
  protected static validation: VOValidation<number> = {
    schema: moneySchema,
    config: {
      onCreate: true,
      throwOnError: true,
    },
  };

  protected static hooks: VOHooks<number, Money> = {
    rules: (money) => {
      if (money.value > 1000000) {
        throwValidationError("amount", "Amount cannot exceed 1,000,000");
      }
    },
  };

  add(other: Money): Money {
    return this.clone(this.value + other.value);
  }
}

class EmailSafe extends ValueObject<EmailProps> {
  protected static validation: VOValidation<EmailProps> = {
    schema: emailSchema,
    config: {
      onCreate: true,
      throwOnError: false,
    },
  };
}

describe("Value Object", () => {
  it("should compare value objects by value", () => {
    const email1 = new Email("test@example.com");
    const email2 = new Email("test@example.com");
    const email3 = new Email("test2@example.com");

    expect(email1.equals(email2)).toBe(true);
    expect(email1.equals(email3)).toBe(false);
  });

  it("should be immutable", () => {
    const email = new Email("test@example.com");

    expect(email.value).toBe("test@example.com");
    expect(() => {
      (email as any).value = "test2@example.com";
    }).toThrow();
  });

  it("should not throw on invalid email", () => {
    const email = new EmailSafe("invalid");
    expect(email.hasValidationErrors).toBe(true);
  });

  it("should store validation errors", () => {
    const email = new EmailSafe("not-an-email");

    expect(email.validationErrors).toBeDefined();
    expect(email.validationErrors?.getMessages()).toContain(
      "Invalid email format"
    );
  });

  it("should not have errors for valid email", () => {
    const email = new EmailSafe("valid@example.com");

    expect(email.hasValidationErrors).toBe(false);
    expect(email.validationErrors).toBeUndefined();
  });

  it("should throw on negative amount", () => {
    expect(() => {
      new Money(-10);
    }).toThrow(ValidationError);
  });

  it("should throw on custom rule violation (amount > 1M)", () => {
    expect(() => {
      new Money(1000001);
    }).toThrow(ValidationError);
  });

  it("should create new instance when adding (immutability)", () => {
    const m1 = new Money(100);
    const m2 = new Money(50);
    const result = m1.add(m2);

    expect(m1.value).toBe(100);
    expect(m2.value).toBe(50);

    expect(result.value).toBe(150);
    expect(result).not.toBe(m1);
    expect(result).not.toBe(m2);
  });
});
