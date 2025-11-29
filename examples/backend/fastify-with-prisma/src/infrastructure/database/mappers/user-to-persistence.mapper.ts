import { Mapper } from "@woltz/rich-domain";
import { User } from "../../../domain/user/user.entity";
import { Post } from "../../../domain/post/post.entity";
import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { PrismaClient } from "@prisma/client";
import { UOWStorage } from "../unit-of-work";

export class PrismaUserToPersistenceMapper extends Mapper<User, void> {
  private readonly registry: EntitySchemaRegistry;

  constructor(private readonly prisma: PrismaClient) {
    super();
    this.registry = new EntitySchemaRegistry()
      .register({
        entity: "User",
        table: "user",
      })
      .register({
        entity: "Post",
        table: "post",
        fields: {
          content: "main_content",
        },
      });
  }

  async build(user: User): Promise<void> {
    if (user.isNew()) {
      await this.createUser(user);
    } else {
      await this.safeUpdate(user);
    }
  }

  private get context(): PrismaClient {
    const ctx = UOWStorage.getStore()?.ctx;
    return (ctx?.client as PrismaClient) ?? this.prisma;
  }

  private async createUser(user: User): Promise<void> {
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

  private async safeUpdate(user: User): Promise<void> {
    if (UOWStorage.getStore()?.ctx?.client) {
      return await this.updateUser(user, this.context);
    }

    return await this.prisma.$transaction(async (tx) => {
      return await this.updateUser(user, tx as PrismaClient);
    });
  }

  private async updateUser(user: User, tx: PrismaClient): Promise<void> {
    const changes = user.getTypedChanges();
    if (changes.isEmpty()) return;

    const batch = changes.toBatchOperations();

    for (const deletion of batch.deletes) {
      if (deletion.entity === "Post") {
        await tx.post.deleteMany({
          where: { id: { in: deletion.ids } },
        });
      }
    }

    for (const creation of batch.creates) {
      if (creation.entity === "Post") {
        await tx.post.createMany({
          data: creation.items.map((item) => {
            const post = item.data as Post;
            return {
              id: post.id.value,
              title: post.title,
              main_content: post.content,
              published: post.published,
              authorId: item.parentId || user.id.value,
              createdAt: post.createdAt,
              updatedAt: post.updatedAt,
            };
          }),
          skipDuplicates: true,
        });
      }
    }

    for (const update of batch.updates) {
      const table = this.registry.getTable(update.entity);

      for (const item of update.items) {
        await (tx as any)[table].update({
          where: { id: item.id },
          data: this.registry.mapFields(update.entity, item.changedFields),
        });
      }
    }
  }
}
