// ============================================================================
// Example Tests - Demonstrating Standard Schema Validation with Zod
// ============================================================================

import { z } from "zod";
import {
  Id,
  BaseProps,
  Aggregate,
  EntityValidation,
  EntityHooks,
} from "../src";
import { throwValidationError, ValidationError } from "../src/validation-error";
import { Address } from "./utils";

interface UserProps extends BaseProps {
  id: Id;
  name: string;
  email: string;
  age: number;
  status: "active" | "inactive";
}

const userSchema = z.object({
  id: z.custom<Id>((val) => val instanceof Id, { message: "Invalid Id" }),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  age: z
    .number()
    .min(0, "Age cannot be negative")
    .max(150, "Age is too high"),
  status: z.enum(["active", "inactive"]),
});

class User extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
    config: {
      onCreate: true,
      onUpdate: true,
      throwOnError: true,
    },
  };

  protected static hooks: EntityHooks<UserProps, User> = {
    defaultValues: {
      age: 18,
      status: "active",
    },
    onCreate: (entity) => {
      console.log(`User created: ${entity.name}`);
    },
    onBeforeUpdate: (entity, snapshot) => {
      // Prevent changing email once set
      if (snapshot.email !== entity.email) {
        console.warn("Email change attempted but blocked");
        return false; // Block the update
      }
      return true;
    },
    rules: (entity) => {
      // Custom business rules
      if (entity.name.toLowerCase() === "admin") {
        throwValidationError("name", 'Name cannot be "admin"');
      }
    },
  };

  get name(): string {
    return this.properties.name;
  }

  set name(value: string) {
    this.properties.name = value;
  }

  get email(): string {
    return this.properties.email;
  }

  set email(value: string) {
    this.properties.email = value;
  }

  get age(): number {
    return this.properties.age;
  }

  set age(value: number) {
    this.properties.age = value;
  }

  get status(): "active" | "inactive" {
    return this.properties.status;
  }

  deactivate(): void {
    this.properties.status = "inactive";
  }

  activate(): void {
    this.properties.status = "active";
  }
}

// ============================================================================
// Example: User with throwOnError: false
// ============================================================================

class UserSafe extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
    config: {
      onCreate: true,
      onUpdate: true,
      throwOnError: false, // Does not throw, stores errors internally
    },
  };

  protected static hooks: EntityHooks<UserProps, UserSafe> = {
    defaultValues: {
      age: 18,
      status: "active",
    },
  };

  get name(): string {
    return this.properties.name;
  }

  get email(): string {
    return this.properties.email;
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("Rich Domain with Standard Schema Validation", () => {
  describe("User Creation with Validation", () => {
    it("should create user with valid data", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
        age: 25,
        status: "active",
      });

      expect(user).toBeInstanceOf(User);
      expect(user.name).toBe("John Doe");
      expect(user.email).toBe("john@example.com");
      expect(user.age).toBe(25);
      expect(user.isNew).toBe(true);
    });

    it("should apply default values", () => {
      const user = new User({
        name: "Jane Doe",
        email: "jane@example.com",
      });

      expect(user.age).toBe(18); // Default value
      expect(user.status).toBe("active"); // Default value
    });

    it("should throw on invalid email", () => {
      expect(() => {
        new User({
          name: "John",
          email: "invalid-email",
        });
      }).toThrow();

      try {
        new User({
          name: "John",
          email: "invalid-email",
        });
      } catch (error) {
        expect(ValidationError.isValidationError(error)).toBe(true);
      }
    });

    it("should throw on invalid name (too short)", () => {
      expect(() => {
        new User({
          name: "J",
          email: "john@example.com",
        });
      }).toThrow();

      try {
        new User({
          name: "J",
          email: "john@example.com",
        });
      } catch (error) {
        expect(ValidationError.isValidationError(error)).toBe(true);
      }
    });

    it("should throw on custom rule violation", () => {
      expect(() => {
        new User({
          name: "admin",
          email: "admin@example.com",
        });
      }).toThrow();

      try {
        new User({
          name: "admin",
          email: "admin@example.com",
        });
      } catch (error) {
        expect(ValidationError.isValidationError(error)).toBe(true);
      }
    });

    it("should not throw when throwOnError is false", () => {
      const user = new UserSafe({
        name: "J", // Too short
        email: "invalid",
      });

      expect(user).toBeInstanceOf(UserSafe);
      expect(user.hasValidationErrors).toBe(true);
      expect(ValidationError.isValidationError(user.validationErrors)).toBe(
        true
      );
      expect(user.validationErrors!.issues.length).toBeGreaterThan(0);
    });

    it("should not have errors when valid and throwOnError is false", () => {
      const user = new UserSafe({
        name: "John Doe",
        email: "john@example.com",
      });

      expect(user).toBeInstanceOf(UserSafe);
      expect(user.hasValidationErrors).toBe(false);
      expect(user.validationErrors).toBeUndefined();
      expect(user.name).toBe("John Doe");
    });
  });

  describe("Update Validation", () => {
    it("should validate on property update", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
      });

      expect(() => {
        user.name = "J"; // Too short
      }).toThrow();

      try {
        user.name = "J";
      } catch (error) {
        expect(ValidationError.isValidationError(error)).toBe(true);
      }
    });

    it("should allow valid updates", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
      });

      user.name = "Jane Doe";
      expect(user.name).toBe("Jane Doe");
    });

    it("should block update via onBeforeUpdate hook", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
      });

      // Email change should be blocked by onBeforeUpdate
      user.email = "newemail@example.com";

      // Email should remain unchanged
      expect(user.email).toBe("john@example.com");
    });

    it("should validate custom rules on update", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
      });

      expect(() => {
        user.name = "admin"; // Blocked by custom rule
      }).toThrow();

      try {
        user.name = "admin";
      } catch (error) {
        expect(ValidationError.isValidationError(error)).toBe(true);
      }
    });
  });

  describe("Serialization", () => {
    it("should serialize to JSON correctly", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        status: "active",
      });

      const json = user.toJson();

      expect(json.name).toBe("John Doe");
      expect(json.email).toBe("john@example.com");
      expect(json.age).toBe(30);
      expect(json.status).toBe("active");
      expect(typeof json.id).toBe("string"); // Id converted to string
    });
  });

  describe("History Tracking", () => {
    it("should track property changes", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
      });

      user.name = "Jane Doe";
      user.age = 25;

      const history = user.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].path).toBe("name");
      expect(history[0].previousValue).toBe("John Doe");
      expect(history[0].currentValue).toBe("Jane Doe");
    });
  });
});

// ============================================================================
// Example: Value Object with Validation
// ============================================================================

describe("Value Object", () => {
  it("should be immutable", () => {
    const address = new Address({
      street: "123 Main St",
      city: "New York",
      zipCode: "10001",
    });

    expect(address.street).toBe("123 Main St");

    // Props are frozen
    expect(() => {
      (address as any).props.street = "New Street";
    }).toThrow();
  });

  it("should compare by value", () => {
    const address1 = new Address({
      street: "123 Main St",
      city: "New York",
      zipCode: "10001",
    });

    const address2 = new Address({
      street: "123 Main St",
      city: "New York",
      zipCode: "10001",
    });

    const address3 = new Address({
      street: "456 Oak Ave",
      city: "Boston",
      zipCode: "02101",
    });

    expect(address1.equals(address2)).toBe(true);
    expect(address1.equals(address3)).toBe(false);
  });
});
