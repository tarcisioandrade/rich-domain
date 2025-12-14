import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import {
  Transactional,
  TypeORMToPersistence,
} from "@woltz/rich-domain-typeorm";
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

  @Transactional()
  protected async onCreate(aggregate: Post, em: EntityManager): Promise<void> {
    const entity = new PostEntity();
    entity.id = aggregate.id.value;
    entity.authorId = aggregate.authorId;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    entity.title = aggregate.title;
    entity.mainContent = aggregate.content;
    entity.published = aggregate.published;

    if (aggregate.tags.length > 0) {
      for (const tag of aggregate.tags) {
        await em.query(
          `INSERT INTO "_PostToTag" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [entity.id, tag.id.value]
        );
      }
    }

    await em.save(entity);
  }
}
