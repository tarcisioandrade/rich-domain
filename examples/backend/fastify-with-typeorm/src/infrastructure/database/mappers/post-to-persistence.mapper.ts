import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import { TypeORMToPersistence } from "@woltz/rich-domain-typeorm";
import { PostEntity } from "../models/Post";
import { TagEntity } from "../models/Tag";
import { EntityManager } from "typeorm/browser";

export class PostToPersistenceMapper extends TypeORMToPersistence<Post> {
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
          table: "_PostToTag",
          sourceKey: "A",
          targetKey: "B",
        },
      },
    },

    parentFk: {
      field: "authorId",
      parentEntity: "User",
    },
  });

  protected readonly entityClasses = new Map<string, new () => any>([
    ["Post", PostEntity],
    ["Tag", TagEntity],
  ]);

  protected async onCreate(aggregate: Post, em: EntityManager): Promise<void> {
    const entity = new PostEntity();
    entity.id = aggregate.id.value;
    entity.authorId = aggregate.authorId;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    entity.title = aggregate.title;
    entity.mainContent = aggregate.content;
    entity.published = aggregate.published;

    await em.save(entity);
  }
}
