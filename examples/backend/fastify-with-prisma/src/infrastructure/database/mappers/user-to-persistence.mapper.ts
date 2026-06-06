import { PrismaClient } from "@prisma/client";
import { User } from "../../../domain/user/user.entity";
import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { PrismaToPersistence } from "@woltz/rich-domain-prisma";

const schemaRegistry = new EntitySchemaRegistry()
  .register({
    entity: "User",
    table: "user",
  })
  .register({
    entity: "Post",
    table: "post",
    collections: {
      tags: {
        type: "reference",
        entity: "Tag",
      },
    },
    fields: {
      content: "main_content",
    },
    parentFk: {
      field: "authorId",
      parentEntity: "User",
    },
  });

export class PrismaUserToPersistenceMapper extends PrismaToPersistence<
  User,
  PrismaClient
> {
  protected readonly registry = schemaRegistry;

  protected async onCreate(user: User) {
    await this.context.user.create({
      data: {
        id: user.id.value,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        posts: {
          createMany: user.posts.length
            ? {
                data: user.posts.map((post) => ({
                  id: post.id.value,
                  title: post.title,
                  main_content: post.content,
                  published: post.published,
                  authorId: user.id.value,
                  createdAt: post.createdAt,
                  updatedAt: post.updatedAt,
                  tagPosts: {
                    createMany: {
                      data: post.tags.map((tag) => ({
                        tagId: tag.id.value,
                        postId: post.id.value,
                      })),
                    },
                  },
                })),
                skipDuplicates: true,
              }
            : undefined,
        },
      },
    });
  }
}
