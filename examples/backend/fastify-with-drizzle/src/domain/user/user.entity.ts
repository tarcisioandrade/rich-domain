import {
  Aggregate,
  EntityHooks,
  EntityValidation,
  Id,
  throwValidationError,
} from "@woltz/rich-domain";
import { z } from "zod";
import { Post } from "../post/post.entity";
import { UserCreatedEvent } from "./events/user-create.event";

export const UserSchema = z.object({
  id: z.custom<Id>(),
  email: z.string().email(),
  name: z.string().min(1),
  posts: z.array(z.instanceof(Post)),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserProps = z.infer<typeof UserSchema>;

export class User extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: UserSchema,
  };

  protected static hooks: EntityHooks<UserProps, User> = {
    onCreate: (entity) => {
      if (entity.isNew()) {
        entity.addDomainEvent(
          new UserCreatedEvent({ email: entity.props.email })
        );
      }
    },
  };

  static create(
    props: Omit<UserProps, "id" | "createdAt" | "updatedAt">
  ): User {
    return new User({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  addPost(post: Post): void {
    this.props.posts.push(post);
  }

  updateName(name: string): void {
    if (name.trim().length === 0) throwValidationError("name", "Name cannot be empty");
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  updateEmail(email: string): void {
    this.props.email = email;
    this.props.updatedAt = new Date();
  }

  get email() {
    return this.props.email;
  }
  get name() {
    return this.props.name;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  get posts() {
    return this.props.posts;
  }
}
