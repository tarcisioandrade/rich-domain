import { eq } from 'drizzle-orm';
import { Database } from '../connection';
import { posts, comments } from '../schema';
import { IPostRepository } from '../../../domain/repositories/post.repository';
import { Post, PostProps } from '../../../domain/entities/post.entity';
import { Comment, CommentProps } from '../../../domain/entities/comment.entity';
import { Id } from '@woltz/rich-domain';

export class PostRepositoryImpl implements IPostRepository {
  constructor(private readonly db: Database) {}

  async save(post: Post): Promise<void> {
    const postData = {
      id: post.id.value,
      title: post.title,
      content: post.content,
      userId: post.userId,
      published: post.published,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    if (post.id.isNew) {
      // Insert post
      await this.db.insert(posts).values(postData);

      // Insert comments if any
      if (post.comments.length > 0) {
        await this.db.insert(comments).values(
          post.comments.map((comment) => ({
            id: comment.id.value,
            content: comment.content,
            userId: comment.userId,
            postId: post.id.value,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
          }))
        );
      }
    } else {
      // Update post
      await this.db
        .update(posts)
        .set(postData)
        .where(eq(posts.id, post.id.value));

      // Get existing comments from the database
      const existingComments = await this.db
        .select()
        .from(comments)
        .where(eq(comments.postId, post.id.value));

      const existingCommentIds = new Set(existingComments.map((c) => c.id));
      const currentCommentIds = new Set(post.comments.map((c) => c.id.value));

      // Delete comments that are not in the current list
      const commentsToDelete = existingComments.filter(
        (c) => !currentCommentIds.has(c.id)
      );
      for (const comment of commentsToDelete) {
        await this.db.delete(comments).where(eq(comments.id, comment.id));
      }

      // Insert or update comments
      for (const comment of post.comments) {
        const commentData = {
          id: comment.id.value,
          content: comment.content,
          userId: comment.userId,
          postId: post.id.value,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        };

        if (existingCommentIds.has(comment.id.value)) {
          await this.db
            .update(comments)
            .set(commentData)
            .where(eq(comments.id, comment.id.value));
        } else {
          await this.db.insert(comments).values(commentData);
        }
      }
    }
  }

  async findById(id: Id): Promise<Post | null> {
    const postResult = await this.db
      .select()
      .from(posts)
      .where(eq(posts.id, id.value))
      .limit(1);

    if (postResult.length === 0) {
      return null;
    }

    const postRow = postResult[0];

    // Get comments for this post
    const commentRows = await this.db
      .select()
      .from(comments)
      .where(eq(comments.postId, postRow.id));

    const postComments: Comment[] = commentRows.map((row) => {
      const commentProps: CommentProps = {
        id: new Id(row.id),
        content: row.content,
        userId: row.userId,
        postId: row.postId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
      return new Comment(commentProps);
    });

    const props: PostProps = {
      id: new Id(postRow.id),
      title: postRow.title,
      content: postRow.content,
      userId: postRow.userId,
      published: postRow.published,
      comments: postComments,
      createdAt: postRow.createdAt,
      updatedAt: postRow.updatedAt,
    };

    return new Post(props);
  }

  async findByUserId(userId: string): Promise<Post[]> {
    const postRows = await this.db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId));

    const postsWithComments = await Promise.all(
      postRows.map(async (postRow) => {
        const commentRows = await this.db
          .select()
          .from(comments)
          .where(eq(comments.postId, postRow.id));

        const postComments: Comment[] = commentRows.map((row) => {
          const commentProps: CommentProps = {
            id: new Id(row.id),
            content: row.content,
            userId: row.userId,
            postId: row.postId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          };
          return new Comment(commentProps);
        });

        const props: PostProps = {
          id: new Id(postRow.id),
          title: postRow.title,
          content: postRow.content,
          userId: postRow.userId,
          published: postRow.published,
          comments: postComments,
          createdAt: postRow.createdAt,
          updatedAt: postRow.updatedAt,
        };

        return new Post(props);
      })
    );

    return postsWithComments;
  }

  async findAll(): Promise<Post[]> {
    const postRows = await this.db.select().from(posts);

    const postsWithComments = await Promise.all(
      postRows.map(async (postRow) => {
        const commentRows = await this.db
          .select()
          .from(comments)
          .where(eq(comments.postId, postRow.id));

        const postComments: Comment[] = commentRows.map((row) => {
          const commentProps: CommentProps = {
            id: new Id(row.id),
            content: row.content,
            userId: row.userId,
            postId: row.postId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          };
          return new Comment(commentProps);
        });

        const props: PostProps = {
          id: new Id(postRow.id),
          title: postRow.title,
          content: postRow.content,
          userId: postRow.userId,
          published: postRow.published,
          comments: postComments,
          createdAt: postRow.createdAt,
          updatedAt: postRow.updatedAt,
        };

        return new Post(props);
      })
    );

    return postsWithComments;
  }

  async delete(id: Id): Promise<void> {
    // Comments will be cascade deleted due to foreign key constraint
    await this.db.delete(posts).where(eq(posts.id, id.value));
  }
}
