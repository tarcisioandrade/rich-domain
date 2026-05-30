import { z } from "zod";
import {
  Id,
  Aggregate,
  EntityValidation,
  EntityHooks,
  ValidationError,
} from "../src";

const userSchema = z.object({
  id: z.custom<Id>((val) => val instanceof Id, { message: "Invalid Id" }),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  age: z.number().min(0, "Age cannot be negative").max(150, "Age is too high"),
  status: z.enum(["active", "inactive"]),
});

type UserProps = z.infer<typeof userSchema>;

class User extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
    config: { onCreate: true, onUpdate: true, throwOnError: true },
  };

  protected static hooks: EntityHooks<UserProps, User> = {
    onBeforeUpdate: (_entity, snapshot) => snapshot.email === _entity.email,
    rules: (entity) => {
      if (entity.name.toLowerCase() === "admin") {
        throw new Error("Name cannot be 'admin'");
      }
      if (entity.name === "changeInRules") {
        entity.changeStatus("inactive");
      }
    },
  };

  get name() {
    return this.props.name;
  }
  set name(value: string) {
    this.props.name = value;
  }
  get email() {
    return this.props.email;
  }
  set email(value: string) {
    this.props.email = value;
  }
  get age() {
    return this.props.age;
  }
  set age(value: number) {
    this.props.age = value;
  }
  get status() {
    return this.props.status;
  }
  changeStatus(status: "active" | "inactive"): void {
    this.props.status = status;
  }
}

class UserCollectingErrors extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
    config: { onCreate: true, onUpdate: true, throwOnError: false },
  };

  protected static hooks: EntityHooks<UserProps, UserCollectingErrors> = {
    rules: (entity) => {
      if (entity.age > 90) {
        entity.addValidationIssue("age", "Age cannot exceed 90 years");
      }
    },
  };

  get name() {
    return this.props.name;
  }
  set name(value: string) {
    this.props.name = value;
  }
  get email() {
    return this.props.email;
  }
  set email(value: string) {
    this.props.email = value;
  }
  get age() {
    return this.props.age;
  }
  changeAge(value: number): void {
    this.props.age = value;
  }
}

class UserFrozen extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
    config: {
      onCreate: true,
      onUpdate: true,
      throwOnError: false,
      persistInvalidMutations: false,
    },
  };

  protected static hooks: EntityHooks<UserProps, UserFrozen> = {
    rules: (entity) => {
      if (entity.age > 90) {
        entity.addValidationIssue("age", "Age cannot exceed 90 years");
      }
    },
  };

  get name() {
    return this.props.name;
  }
  set name(value: string) {
    this.props.name = value;
  }
  get age() {
    return this.props.age;
  }
  changeAge(value: number): void {
    this.props.age = value;
  }
}

const userWithOptionalAddressSchema = userSchema.extend({
  address: z.string().optional(),
});

type UserWithAddressProps = z.infer<typeof userWithOptionalAddressSchema>;

class UserWithOptionalAddress extends Aggregate<UserWithAddressProps> {
  protected static validation: EntityValidation<UserWithAddressProps> = {
    schema: userWithOptionalAddressSchema,
    config: { onCreate: true, onUpdate: true, throwOnError: false },
  };

  removeAddress(): void {
    delete this.props.address;
  }
}

function createInvalidUser() {
  return () =>
    new User({
      name: "J",
      email: "invalid",
      age: 30,
      status: "active",
    });
}

describe("Entity validation", () => {
  describe("ValidationError formatting", () => {
    it("should expose message, paths, formatted errors, summary, and toJSON", () => {
      try {
        createInvalidUser()();
        fail("Should have thrown ValidationError");
      } catch (error) {
        const validationError = error as ValidationError;

        expect(validationError).toBeInstanceOf(ValidationError);
        expect(validationError.entityName).toBe("User");
        expect(validationError.message).toContain("[User]");
        expect(validationError.message).toContain("Validation failed with");
        expect(validationError.message).toContain('"name"');

        const formatted = validationError.getFormattedErrors();
        expect(formatted).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: "name" }),
            expect.objectContaining({ path: "email" }),
          ])
        );
        formatted.forEach((item) => {
          expect(typeof item.path).toBe("string");
          expect(typeof item.message).toBe("string");
        });

        const summary = validationError.getSummary();
        expect(summary).toContain("[User]");
        expect(summary).toContain("name");
        expect(summary).toContain("email");

        expect(validationError.toJSON()).toMatchObject({
          name: "ValidationError",
          entityName: "User",
          issues: expect.any(Array),
        });
      }
    });
  });

  describe("Create (throwOnError: true)", () => {
    it("should create a valid entity", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
        age: 25,
        status: "active",
      });

      expect(user.name).toBe("John Doe");
      expect(user.isNew()).toBe(true);
    });

    it.each([
      ["invalid email", { name: "John", email: "invalid-email" }],
      ["invalid name", { name: "J", email: "john@example.com" }],
    ] as const)("should throw ValidationError on %s", (_label, overrides) => {
      expect(
        () =>
          new User({
            age: 30,
            status: "active",
            ...overrides,
          })
      ).toThrow(ValidationError);
    });

    it("should throw from rules on create", () => {
      expect(
        () =>
          new User({
            name: "admin",
            email: "admin@example.com",
            age: 30,
            status: "active",
          })
      ).toThrow(Error);
    });
  });

  describe("Create (throwOnError: false)", () => {
    it("should collect errors without throwing and clear when valid", () => {
      const invalid = new UserCollectingErrors({
        name: "J",
        email: "invalid",
        age: 30,
        status: "active",
      });

      expect(invalid.hasValidationErrors).toBe(true);
      expect(invalid.validationErrors).toBeInstanceOf(ValidationError);

      const valid = new UserCollectingErrors({
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        status: "active",
      });

      expect(valid.hasValidationErrors).toBe(false);
      expect(valid.validationErrors).toBeUndefined();
    });

    it("should merge schema and rules issues on create", () => {
      const user = new UserCollectingErrors({
        name: "J",
        email: "john@example.com",
        age: 95,
        status: "active",
      });

      expect(user.validationErrors?.issues.length).toBeGreaterThanOrEqual(2);
      expect(user.validationErrors?.hasErrorsForPath("age")).toBe(true);
      expect(user.validationErrors?.hasErrorsForPath("name")).toBe(true);
    });
  });

  describe("Update (throwOnError: true)", () => {
    const validUser = () =>
      new User({
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        status: "active",
      });

    it("should throw on invalid update and allow valid update", () => {
      const user = validUser();

      expect(() => {
        user.name = "J";
      }).toThrow(ValidationError);

      user.name = "Jane Doe";
      expect(user.name).toBe("Jane Doe");
    });

    it("should block update when onBeforeUpdate returns false", () => {
      const user = validUser();

      user.email = "newemail@example.com";

      expect(user.email).toBe("john@example.com");
    });

    it("should throw from rules on update", () => {
      const user = validUser();

      expect(() => {
        user.name = "admin";
      }).toThrow(Error);
    });

    it("should not loop when rules mutate the entity", () => {
      const user = validUser();

      expect(() => {
        user.name = "changeInRules";
      }).not.toThrow();

      expect(user.status).toBe("inactive");
    });
  });

  describe("Update (throwOnError: false)", () => {
    describe("persistInvalidMutations: true (default)", () => {
      it("should keep mutations and report all current schema and rules issues", () => {
        const user = new UserCollectingErrors({
          name: "John Doe",
          email: "john@example.com",
          age: 27,
          status: "active",
        });

        user.changeAge(95);
        user.name = "J";

        expect(user.age).toBe(95);
        expect(user.name).toBe("J");
        expect(user.toJSON().age).toBe(95);
        expect(user.validationErrors?.getFormattedErrors()).toEqual(
          expect.arrayContaining([
            {
              path: "age",
              message: "Age cannot exceed 90 years",
            },
            {
              path: "name",
              message: expect.stringContaining("2 characters"),
            },
          ])
        );
      });

      it("should allow fixing one field while other errors remain", () => {
        const user = new UserCollectingErrors({
          name: "John Doe",
          email: "invalid",
          age: 30,
          status: "active",
        });

        expect(user.hasValidationErrors).toBe(true);

        user.name = "Jane Doe";

        expect(user.name).toBe("Jane Doe");
        expect(user.hasValidationErrors).toBe(true);
        expect(user.validationErrors?.hasErrorsForPath("email")).toBe(true);
        expect(user.validationErrors?.hasErrorsForPath("name")).toBe(false);
      });

      it("should clear validation errors when all issues are resolved", () => {
        const user = new UserCollectingErrors({
          name: "John Doe",
          email: "invalid",
          age: 30,
          status: "active",
        });

        user.email = "fixed@example.com";

        expect(user.email).toBe("fixed@example.com");
        expect(user.hasValidationErrors).toBe(false);
      });

      it("should reject delete without TypeError when entity stays invalid", () => {
        const user = new UserWithOptionalAddress({
          name: "John Doe",
          email: "invalid",
          age: 30,
          status: "active",
          address: "Main St",
        });

        expect(() => user.removeAddress()).not.toThrow();
        expect(user.props.address).toBeUndefined();
        expect(user.validationErrors?.hasErrorsForPath("email")).toBe(true);
      });
    });

    describe("persistInvalidMutations: false", () => {
      it("should block mutations while errors already exist", () => {
        const user = new UserFrozen({
          name: "J",
          email: "invalid",
          age: 30,
          status: "active",
        });

        user.name = "Jane Doe";

        expect(user.name).toBe("J");
        expect(user.hasValidationErrors).toBe(true);
      });

      it("should revert the first invalid mutation", () => {
        const user = new UserFrozen({
          name: "John Doe",
          email: "john@example.com",
          age: 27,
          status: "active",
        });

        user.changeAge(95);

        expect(user.age).toBe(27);
        expect(user.validationErrors?.hasErrorsForPath("age")).toBe(true);
      });
    });
  });
});
