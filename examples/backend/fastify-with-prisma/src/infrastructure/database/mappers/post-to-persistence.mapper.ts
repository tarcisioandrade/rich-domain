import { AggregateChanges, EntitySchemaRegistry } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import {
  PrismaBatchExecutor,
  PrismaToPersistence,
} from "@woltz/rich-domain-prisma";
import { PrismaClient } from "@prisma/client";

export class PrismaPostToPersistenceMapper extends PrismaToPersistence<
  Post,
  PrismaClient
> {
  protected readonly registry = new EntitySchemaRegistry().register({
    entity: "Post",
    table: "post",
    fields: {
      content: "main_content",
    },
    collections: {
      tags: {
        type: "reference",
        entity: "Tag",
        junction: {
          table: "TagPost",
          sourceKey: "postId",
          targetKey: "tagId",
        },
      },
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

    if (post.tags.length) {
      await this.context.tagPost.createMany({
        data: post.tags.map((tag) => ({
          tagId: tag.id.value,
          postId: post.id.value,
        })),
      });
    }
  }

  protected async onUpdate(
    changes: AggregateChanges
  ): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
    });

    await executor.execute(changes);
  }
}
