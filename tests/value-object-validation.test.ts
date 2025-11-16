import { z } from "zod";
import { ValueObject, ValidationError, throwValidationError } from "../src";
import { VOHooks, VOValidation } from "../src/types";

// ============================================================================
// Test Value Objects with Validation
// ============================================================================

interface EmailProps {
  value: string;
}

const emailSchema = z.object({
  value: z.string().email("Invalid email format"),
});

class Email extends ValueObject<EmailProps> {
  protected static validation: VOValidation<EmailProps> = {
    schema: emailSchema,
    config: {
      onCreate: true,
      throwOnError: true,
    },
  };

  get value(): string {
    return this.props.value;
  }
}

// ============================================================================
// Test Value Object with Default Values and Hooks
// ============================================================================

interface MoneyProps {
  amount: number;
  currency: string;
}

const moneySchema = z.object({
  amount: z.number().min(0, "Amount must be non-negative"),
  currency: z
    .string()
    .length(3, "Currency must be 3 characters (e.g., USD, EUR)"),
});

class Money extends ValueObject<MoneyProps> {
  protected static validation: VOValidation<MoneyProps> = {
    schema: moneySchema,
    config: {
      onCreate: true,
      throwOnError: true,
    },
  };

  protected static hooks: VOHooks<MoneyProps, Money> = {
    defaultValues: {
      currency: "USD",
    },
    rules: (money) => {
      if (money.amount > 1000000) {
        throwValidationError("amount", "Amount cannot exceed 1,000,000");
      }
    },
  };

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add money with different currencies");
    }
    return this.clone({ amount: this.amount + other.amount });
  }
}

// ============================================================================
// Test Value Object with throwOnError: false
// ============================================================================

class EmailSafe extends ValueObject<EmailProps> {
  protected static validation: VOValidation<EmailProps> = {
    schema: emailSchema,
    config: {
      onCreate: true,
      throwOnError: false,
    },
  };

  get value(): string {
    return this.props.value;
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("ValueObject with Validation", () => {
  describe("Email ValueObject", () => {
    it("should create email with valid value", () => {
      const email = new Email({ value: "test@example.com" });
      expect(email.value).toBe("test@example.com");
      expect(email.hasValidationErrors).toBe(false);
    });

    it("should throw on invalid email format", () => {
      expect(() => {
        new Email({ value: "invalid-email" });
      }).toThrow(ValidationError);
    });

    it("should have correct error message", () => {
      try {
        new Email({ value: "invalid" });
      } catch (error) {
        expect(ValidationError.isValidationError(error)).toBe(true);
        if (ValidationError.isValidationError(error)) {
          expect(error.getMessages()).toContain("Invalid email format");
        }
      }
    });
  });

  describe("Money ValueObject with Hooks", () => {
    it("should create money with valid data", () => {
      const money = new Money({ amount: 100, currency: "USD" });
      expect(money.amount).toBe(100);
      expect(money.currency).toBe("USD");
    });

    it("should apply default currency", () => {
      const money = new Money({ amount: 50 } as any);
      expect(money.amount).toBe(50);
      expect(money.currency).toBe("USD");
    });

    it("should throw on negative amount", () => {
      expect(() => {
        new Money({ amount: -10, currency: "USD" });
      }).toThrow(ValidationError);
    });

    it("should throw on invalid currency code", () => {
      expect(() => {
        new Money({ amount: 100, currency: "US" });
      }).toThrow(ValidationError);
    });

    it("should throw on custom rule violation (amount > 1M)", () => {
      expect(() => {
        new Money({ amount: 1000001, currency: "USD" });
      }).toThrow(ValidationError);
    });

    it("should add money with same currency", () => {
      const m1 = new Money({ amount: 100, currency: "USD" });
      const m2 = new Money({ amount: 50, currency: "USD" });
      const result = m1.add(m2);

      expect(result.amount).toBe(150);
      expect(result.currency).toBe("USD");
    });

    it("should throw when adding different currencies", () => {
      const m1 = new Money({ amount: 100, currency: "USD" });
      const m2 = new Money({ amount: 50, currency: "EUR" });

      expect(() => m1.add(m2)).toThrow(
        "Cannot add money with different currencies"
      );
    });
  });

  describe("Email ValueObject with throwOnError: false", () => {
    it("should not throw on invalid email", () => {
      const email = new EmailSafe({ value: "invalid" });
      expect(email.hasValidationErrors).toBe(true);
    });

    it("should store validation errors", () => {
      const email = new EmailSafe({ value: "not-an-email" });

      expect(email.validationErrors).toBeDefined();
      expect(email.validationErrors?.getMessages()).toContain(
        "Invalid email format"
      );
    });

    it("should not have errors for valid email", () => {
      const email = new EmailSafe({ value: "valid@example.com" });

      expect(email.hasValidationErrors).toBe(false);
      expect(email.validationErrors).toBeUndefined();
    });
  });

  describe("ValueObject Immutability", () => {
    it("should remain immutable with validation", () => {
      const email = new Email({ value: "test@example.com" });

      expect(() => {
        (email as any).props.value = "changed@example.com";
      }).toThrow();
    });

    it("should create new instance when adding (immutability)", () => {
      const m1 = new Money({ amount: 100, currency: "USD" });
      const m2 = new Money({ amount: 50, currency: "USD" });
      const result = m1.add(m2);

      // Original instances unchanged
      expect(m1.amount).toBe(100);
      expect(m2.amount).toBe(50);

      // New instance created
      expect(result.amount).toBe(150);
      expect(result).not.toBe(m1);
      expect(result).not.toBe(m2);
    });
  });
});
