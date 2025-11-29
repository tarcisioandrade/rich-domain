import { z } from "zod";
import { Entity, EntityValidation, Id } from "@woltz/rich-domain";
import { User } from "../user/user.entity";

export const PostSchema = z.object({
  id: z.custom<Id>(),
  title: z.string().min(1),
  content: z.string().min(1),
  published: z.boolean(),
  authorId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PostProps = z.infer<typeof PostSchema>;

export class Post extends Entity<PostProps> {
  protected static validation: EntityValidation<PostProps> = {
    schema: PostSchema,
  };

  static restore(props: PostProps): Post {
    return new Post(props);
  }

  updateTitle(title: string): void {
    if (title.trim().length === 0) {
      throw new Error("Title cannot be empty");
    }
    this.props.title = title;
  }

  updateContent(content: string): void {
    if (content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }
    this.props.content = content;
  }

  publish(): void {
    this.props.published = true;
  }

  unpublish(): void {
    this.props.published = false;
  }

  public getTypedChanges() {
    type PostEntities = {
      Post: Post;
      User: User;
    };

    return this.getChanges<PostEntities>();
  }

  get title(): string {
    return this.props.title;
  }

  get content(): string {
    return this.props.content;
  }

  get published(): boolean {
    return this.props.published;
  }

  get authorId(): string {
    return this.props.authorId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
