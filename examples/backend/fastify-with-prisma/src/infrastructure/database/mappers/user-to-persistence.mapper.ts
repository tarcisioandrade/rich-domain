import { User } from "../../../domain/user/user.entity";
import { AggregateChanges, EntitySchemaRegistry } from "@woltz/rich-domain";
import {
  PrismaBatchExecutor,
  PrismaToPersistence,
} from "@woltz/rich-domain-prisma";

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
  });

export class PrismaUserToPersistenceMapper extends PrismaToPersistence<User> {
  protected readonly registry = schemaRegistry;

  protected async onCreate(user: User): Promise<void> {
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
                })),
                skipDuplicates: true,
              }
            : undefined,
        },
      },
    });
  }

  protected async onUpdate(
    user: User,
    changes: AggregateChanges
  ): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
      rootId: user.id.value,
    });

    await executor.execute(changes);
  }
}
