import { z } from "zod";
import {
  Aggregate,
  Id,
  EntityValidation,
  EntityHooks,
} from "@woltz/rich-domain";

const userSchema = z.object({
  id: z.custom<Id>((val) => val instanceof Id, { message: "Invalid Id" }),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export interface UserProps extends z.infer<typeof userSchema> {}

export class User extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
  };

  protected static hooks: EntityHooks<UserProps, User> = {
    onBeforeUpdate: (entity) => {
      entity.props.updatedAt = new Date();
      return true;
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

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateProfile(name: string, email: string): void {
    this.name = name;
    this.email = email;
  }
}
