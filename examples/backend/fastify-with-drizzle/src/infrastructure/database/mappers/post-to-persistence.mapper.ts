import { EntitySchemaRegistry } from "@woltz/rich-domain";
import {
  DrizzleToPersistence,
  DrizzleUnitOfWork,
  Transactional,
} from "@woltz/rich-domain-drizzle";
import { Post } from "../../../domain/post/post.entity";
import { posts, tags, postsToTags } from "../schema";
import { getDb } from "../db";

export const postSchemaRegistry = new EntitySchemaRegistry().register({
  entity: "Post",
  table: "posts",
  collections: {
    tags: {
      type: "reference",
      entity: "Tag",
      junction: {
        table: "posts_to_tags",
        sourceKey: "postId",
        targetKey: "tagId",
      },
    },
  },
});

export class PostToPersistenceMapper extends DrizzleToPersistence<Post> {
  protected readonly registry = postSchemaRegistry;

  protected readonly tableMap = new Map<string, any>([
    ["Post", posts],
    ["Tag", tags],
    ["posts_to_tags", postsToTags],
  ]);

  constructor(uow: DrizzleUnitOfWork) {
    super(uow);
  }

  protected getDb() {
    return getDb() as any;
  }

  @Transactional()
  protected async onCreate(post: Post): Promise<void> {
    await this.context.insert(posts).values({
      id: post.id.value,
      title: post.title,
      content: post.content,
      published: post.published,
      authorId: post.authorId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    });

    if (post.tags.length > 0) {
      await this.context
        .insert(postsToTags)
        .values(
          post.tags.map((tag) => ({
            postId: post.id.value,
            tagId: tag.id.value,
          }))
        )
        .onConflictDoNothing();
    }
  }
}
