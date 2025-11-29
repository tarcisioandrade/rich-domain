import { AggregateChanges, EntitySchemaRegistry } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import { PrismaBatchExecutor, PrismaToPersistence } from "@woltz/rich-domain-prisma";

export class PrismaPostToPersistenceMapper extends PrismaToPersistence<Post> {
  protected readonly registry = new EntitySchemaRegistry().register({
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

  protected async onCreate(post: Post): Promise<void> {
    await this.context.post.create({
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

  protected async onUpdate(
    post: Post,
    changes: AggregateChanges
  ): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
      rootId: post.id.value,
    });

    await executor.execute(changes);
  }
}
