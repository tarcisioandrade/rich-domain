import { EntitySchemaRegistry } from "@woltz/rich-domain";
import {
  DrizzleToPersistence,
  DrizzleUnitOfWork,
  Transactional,
} from "@woltz/rich-domain-drizzle";
import { User } from "../../../domain/user/user.entity";
import { users, posts, tags, postsToTags } from "../schema";
import { getDb } from "../db";

export const userSchemaRegistry = new EntitySchemaRegistry()
  .register({
    entity: "User",
    table: "users",
    collections: {
      posts: {
        type: "owned",
        entity: "Post",
      },
    },
  })
  .register({
    entity: "Post",
    table: "posts",
    parentFk: {
      field: "authorId",
      parentEntity: "User",
    },
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
  })
  .register({
    entity: "Tag",
    table: "tags",
  });

export class UserToPersistenceMapper extends DrizzleToPersistence<User> {
  protected readonly registry = userSchemaRegistry;

  protected readonly tableMap = new Map<string, any>([
    ["User", users],
    ["Post", posts],
    ["Tag", tags],
    ["posts_to_tags", postsToTags],
  ]);

  constructor(uow: DrizzleUnitOfWork) {
    super(uow);
  }

  protected getDb() {
    return getDb();
  }

  @Transactional()
  protected async onCreate(user: User): Promise<void> {
    await this.context.insert(users).values({
      id: user.id.value,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    if (user.posts.length > 0) {
      await this.context.insert(posts).values(
        user.posts.map((p) => ({
          id: p.id.value,
          title: p.title,
          content: p.content,
          published: p.published,
          authorId: user.id.value,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }))
      );
    }
  }
}
