import { Mapper } from "@woltz/rich-domain";
import { User } from "../../../domain/user/user.entity";
import { Post } from "../../../domain/post/post.entity";
import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { PrismaClient } from "@prisma/client";

export class PrismaUserToPersistenceMapper extends Mapper<User, void> {
  private registry = new EntitySchemaRegistry()
    .register({
      entity: "User",
      table: "user",
      fields: {
        name: "full_name",
      },
    })
    .register({
      entity: "Post",
      table: "post",
      parentFk: {
        field: "authorId",
        parentEntity: "User",
      },
    });

  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  async build(user: User): Promise<void> {
    if (user.isNew()) {
      return await this.createUser(user);
    }

    return await this.updateUser(user);
  }

  private async createUser(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id.value,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        posts: {
          createMany: {
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
          },
        },
      },
    });
  }

  private async updateUser(user: User): Promise<void> {
    const changes = user.getTypedChanges();

    if (changes.isEmpty()) {
      return;
    }

    const batch = changes.toBatchOperations();

    await this.prisma.$transaction(async (tx) => {
      for (const del of batch.deletes) {
        if (del.entity === "Post") {
          await tx.post.deleteMany({
            where: { id: { in: del.ids } },
          });
        }
      }

      for (const create of batch.creates) {
        if (create.entity === "Post") {
          await tx.post.createMany({
            data: create.items.map((item) => {
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

      for (const upd of batch.updates) {
        const table = this.registry.getTable(upd.entity);

        for (const item of upd.items) {
          await (tx as any)[table].update({
            where: { id: item.id },
            data: this.registry.mapFields(upd.entity, item.changedFields),
          });
        }
      }
    });
  }
}
