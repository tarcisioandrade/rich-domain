import { EntitySchemaRegistry, Mapper } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import { PrismaClient } from "@prisma/client";

export class PrismaPostToPersistenceMapper extends Mapper<Post, void> {
  private registry = new EntitySchemaRegistry().register({
    entity: "Post",
    table: "post",
    fields: {
      content: "main_content",
    },
    parentFk: {
      field: "authorId",
      parentEntity: "User",
    },
  });

  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  public async build(post: Post) {
    if (post.isNew()) {
      return await this.createPost(post);
    }
    return await this.updatePost(post);
  }

  private async createPost(post: Post): Promise<void> {
    await this.prisma.post.create({
      data: {
        id: post.id.value,
        title: post.title,
        main_content: post.content,
        published: post.published,
        authorId: post.authorId,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  }

  private async updatePost(post: Post): Promise<void> {
    const changes = post.getTypedChanges();

    if (changes.isEmpty()) {
      return;
    }

    const batch = changes.toBatchOperations();

    await this.prisma.$transaction(async (tx) => {
      for (const del of batch.deletes) {
        await tx.post.deleteMany({
          where: { id: { in: del.ids } },
        });
      }

      for (const create of batch.creates) {
        await tx.post.createMany({
          data: create.items.map((item) => {
            const post = item.data as Post;
            return {
              id: post.id.value,
              title: post.title,
              main_content: post.content,
              published: post.published,
              authorId: post.authorId,
              createdAt: post.createdAt,
              updatedAt: post.updatedAt,
            };
          }),
          skipDuplicates: true,
        });
      }

      for (const upd of batch.updates) {
        for (const item of upd.items) {
          await tx.post.update({
            where: { id: item.id },
            data: {
              ...this.registry.mapFields("Post", item.changedFields),
              updatedAt: new Date(),
            },
          });
        }
      }
    });
  }
}
