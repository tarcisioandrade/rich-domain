import { z } from 'zod';
import { Aggregate, Id, EntityValidation, EntityHooks } from '@woltz/rich-domain';
import { Comment, CommentProps } from './comment.entity';

const postSchema = z.object({
  id: z.custom<Id>((val) => val instanceof Id, { message: 'Invalid Id' }),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(1, 'Content cannot be empty'),
  userId: z.string().uuid('Invalid user ID'),
  published: z.boolean(),
  comments: z.array(z.custom<Comment>((val) => val instanceof Comment)),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export interface PostProps extends z.infer<typeof postSchema> {}

export class Post extends Aggregate<PostProps> {
  protected static validation: EntityValidation<PostProps> = {
    schema: postSchema,
  };

  protected static hooks: EntityHooks<PostProps, Post> = {
    onBeforeUpdate: (entity) => {
      entity.props.updatedAt = new Date();
      return true;
    },
  };

  get title(): string {
    return this.props.title;
  }

  set title(value: string) {
    this.props.title = value;
  }

  get content(): string {
    return this.props.content;
  }

  set content(value: string) {
    this.props.content = value;
  }

  get userId(): string {
    return this.props.userId;
  }

  get published(): boolean {
    return this.props.published;
  }

  get comments(): Comment[] {
    return this.props.comments;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updatePost(title: string, content: string): void {
    this.title = title;
    this.content = content;
  }

  publish(): void {
    this.props.published = true;
  }

  unpublish(): void {
    this.props.published = false;
  }

  addComment(comment: Comment): void {
    this.props.comments = [...this.props.comments, comment];
  }

  removeComment(commentId: Id): void {
    this.props.comments = this.props.comments.filter(
      (c) => !c.id.equals(commentId)
    );
  }

  updateComment(commentId: Id, content: string): void {
    const comment = this.props.comments.find((c) => c.id.equals(commentId));
    if (!comment) {
      throw new Error('Comment not found');
    }
    comment.updateContent(content);
    // Trigger change detection
    this.props.comments = [...this.props.comments];
  }
}
