import { z } from "zod";
import {
  Id,
  Aggregate,
  EntityValidation,
  EntityHooks,
  ValidationError,
} from "../src";

describe("Optional input properties", () => {
  const userWithPasswordSchema = z.object({
    id: z.custom<Id>((val) => val instanceof Id),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string(),
  });

  type UserWithPasswordProps = z.infer<typeof userWithPasswordSchema>;

  class UserWithPassword extends Aggregate<UserWithPasswordProps, "password"> {
    protected static validation: EntityValidation<UserWithPasswordProps> = {
      schema: userWithPasswordSchema,
    };

    protected static hooks: EntityHooks<
      UserWithPasswordProps,
      UserWithPassword
    > = {
      onBeforeCreate: (props) => {
        if (!props.password) {
          props.password = "generated-password-123";
        }
      },
    };

    get email() {
      return this.props.email;
    }

    get password() {
      return this.props.password;
    }

    get name() {
      return this.props.name;
    }
  }

  it("should generate optional fields in onBeforeCreate and accept explicit values", () => {
    const generated = new UserWithPassword({
      email: "test@example.com",
      name: "Test User",
    });

    expect(generated.password).toBe("generated-password-123");

    const explicit = new UserWithPassword({
      email: "test@example.com",
      name: "Test User",
      password: "custom-password-12345678",
    });

    expect(explicit.password).toBe("custom-password-12345678");
  });

  it("should throw when generated optional value fails schema", () => {
    class ShortPasswordUser extends Aggregate<
      UserWithPasswordProps,
      "password"
    > {
      protected static validation: EntityValidation<UserWithPasswordProps> = {
        schema: userWithPasswordSchema,
      };

      protected static hooks: EntityHooks<
        UserWithPasswordProps,
        ShortPasswordUser
      > = {
        onBeforeCreate: (props) => {
          if (!props.password) {
            props.password = "short";
          }
        },
      };
    }

    expect(() => {
      new ShortPasswordUser({
        email: "test@example.com",
        name: "Test User",
      });
    }).toThrow(ValidationError);
  });

  it("should support multiple optional input fields", () => {
    const multiOptionalSchema = z.object({
      id: z.custom<Id>((val) => val instanceof Id),
      email: z.string().email(),
      password: z.string().min(8),
      createdAt: z.date(),
      updatedAt: z.date(),
    });

    type MultiOptionalProps = z.infer<typeof multiOptionalSchema>;

    class MultiOptional extends Aggregate<
      MultiOptionalProps,
      "password" | "createdAt" | "updatedAt"
    > {
      protected static validation: EntityValidation<MultiOptionalProps> = {
        schema: multiOptionalSchema,
      };

      protected static hooks: EntityHooks<MultiOptionalProps, MultiOptional> = {
        onBeforeCreate: (props) => {
          const now = new Date();
          if (!props.password) props.password = "generated-12345678";
          if (!props.createdAt) props.createdAt = now;
          if (!props.updatedAt) props.updatedAt = now;
        },
      };

      get password() {
        return this.props.password;
      }

      get createdAt() {
        return this.props.createdAt;
      }

      get updatedAt() {
        return this.props.updatedAt;
      }
    }

    const entity = new MultiOptional({
      email: "test@example.com",
    });

    expect(entity.password).toBe("generated-12345678");
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
  });
});
