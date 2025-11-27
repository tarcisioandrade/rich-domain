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

interface UserProps extends z.infer<typeof userSchema> {}
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
    onCreate: (entity) => {},
    onBeforeUpdate: (entity, snapshot) => {
      if (snapshot.email !== entity.email) {
        return false;
      }
      return true;
    },
    rules: (entity) => {
      if (entity.name.toLowerCase() === "admin") {
        throw new Error("Name cannot be 'admin'");
      }
    },
  };

  get name(): string {
    return this.props.name;
  }

  set name(value: string) {
    this.props.name = value;
  }

  get email(): string {
    return this.props.email;
  }

  set email(value: string) {
    this.props.email = value;
  }

  get age(): number {
    return this.props.age;
  }

  set age(value: number) {
    this.props.age = value;
  }

  get status(): "active" | "inactive" {
    return this.props.status;
  }

  deactivate(): void {
    this.props.status = "inactive";
  }

  activate(): void {
    this.props.status = "active";
  }
}

class UserSafe extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
    config: {
      onCreate: true,
      onUpdate: true,
      throwOnError: false,
    },
  };

  protected static hooks: EntityHooks<UserProps, UserSafe> = {};

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }
}

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
      expect(user.isNew()).toBe(true);
    });

    it("should throw on invalid email", () => {
      expect(() => {
        new User({
          name: "John",
          email: "invalid-email",
          age: 30,
          status: "active",
        });
      }).toThrow(ValidationError);
    });

    it("should throw on invalid name (too short)", () => {
      expect(() => {
        new User({
          name: "J",
          email: "john@example.com",
          age: 30,
          status: "active",
        });
      }).toThrow(ValidationError);
    });

    it("should throw on custom rule violation", () => {
      expect(() => {
        new User({
          name: "admin",
          email: "admin@example.com",
          age: 30,
          status: "active",
        });
      }).toThrow(Error);
    });

    it("should not throw when throwOnError is false", () => {
      const user = new UserSafe({
        name: "J",
        email: "invalid",
        age: 30,
        status: "active",
      });

      expect(user).toBeInstanceOf(UserSafe);
      expect(user.hasValidationErrors).toBe(true);
      expect(user.validationErrors).toBeInstanceOf(ValidationError);
      expect(user.validationErrors?.issues.length).toBeGreaterThan(0);
    });

    it("should not have errors when valid and throwOnError is false", () => {
      const user = new UserSafe({
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        status: "active",
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
        age: 30,
        status: "active",
      });

      expect(() => {
        user.name = "J";
      }).toThrow(ValidationError);
    });

    it("should allow valid updates", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        status: "active",
      });

      user.name = "Jane Doe";
      expect(user.name).toBe("Jane Doe");
    });

    it("should block update via onBeforeUpdate hook", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        status: "active",
      });

      user.email = "newemail@example.com";

      expect(user.email).toBe("john@example.com");
    });

    it("should validate custom rules on update", () => {
      const user = new User({
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        status: "active",
      });

      expect(() => {
        user.name = "admin";
      }).toThrow(Error);
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
      expect(typeof json.id).toBe("string");
    });
  });
});
