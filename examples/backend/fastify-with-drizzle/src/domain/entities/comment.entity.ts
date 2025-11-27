import { z } from "zod";
import { Entity, Id, EntityValidation, EntityHooks } from "@woltz/rich-domain";

const commentSchema = z.object({
  id: z.custom<Id>((val) => val instanceof Id, { message: "Invalid Id" }),
  content: z.string().min(1, "Content cannot be empty"),
  userId: z.string().uuid("Invalid user ID"),
  postId: z.string().uuid("Invalid post ID"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export interface CommentProps extends z.infer<typeof commentSchema> {}

export class Comment extends Entity<CommentProps> {
  protected static validation: EntityValidation<CommentProps> = {
    schema: commentSchema,
  };

  protected static hooks: EntityHooks<CommentProps, Comment> = {
    onBeforeUpdate: (entity) => {
      entity.props.updatedAt = new Date();
      return true;
    },
  };

  get content(): string {
    return this.props.content;
  }

  set content(value: string) {
    this.props.content = value;
  }

  get userId(): string {
    return this.props.userId;
  }

  get postId(): string {
    return this.props.postId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateContent(content: string): void {
    this.content = content;
  }
}
