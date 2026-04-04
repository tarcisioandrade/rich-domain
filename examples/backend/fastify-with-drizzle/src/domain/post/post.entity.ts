import { z } from "zod";
import {
  Aggregate,
  DomainError,
  EntityValidation,
  Id,
} from "@woltz/rich-domain";
import { Tag } from "../tag/tags";

export const PostSchema = z.object({
  id: z.custom<Id>(),
  title: z.string().min(1),
  content: z.string().min(1),
  published: z.boolean(),
  authorId: z.string(),
  tags: z.array(z.instanceof(Tag)),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PostProps = z.infer<typeof PostSchema>;

export class Post extends Aggregate<PostProps> {
  protected static validation: EntityValidation<PostProps> = {
    schema: PostSchema,
  };

  static restore(props: PostProps): Post {
    return new Post(props);
  }

  updateTitle(title: string): void {
    if (title.trim().length === 0) throw new Error("Title cannot be empty");
    this.props.title = title;
    this.props.updatedAt = new Date();
  }

  updateContent(content: string): void {
    if (content.trim().length === 0) throw new Error("Content cannot be empty");
    this.props.content = content;
    this.props.updatedAt = new Date();
  }

  publish(): void {
    this.props.published = true;
  }

  unpublish(): void {
    this.props.published = false;
  }

  addTag(tag: Tag): void {
    this.props.tags.push(tag);
  }

  removeTag(tag: Tag): void {
    const found = this.props.tags.find((t) => t.id.equals(tag.id));
    if (!found) throw new DomainError("Tag not found");
    this.props.tags = this.props.tags.filter((t) => !t.id.equals(tag.id));
  }

  get title() {
    return this.props.title;
  }
  get content() {
    return this.props.content;
  }
  get published() {
    return this.props.published;
  }
  get authorId() {
    return this.props.authorId;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  get tags() {
    return this.props.tags;
  }
}
