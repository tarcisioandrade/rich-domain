import { User } from "../../../domain/user/user.entity";
import { EntitySchemaRegistry } from "@woltz/rich-domain";
import {
  Transactional,
  TypeORMToPersistence,
} from "@woltz/rich-domain-typeorm";
import { UserEntity } from "../models/User";
import { PostEntity } from "../models/Post";
import { TagEntity } from "../models/Tag";
import { EntityManager } from "typeorm/entity-manager/EntityManager.js";

export class UserToPersistenceMapper extends TypeORMToPersistence<User> {
  protected readonly registry = new EntitySchemaRegistry()
    .register({
      entity: "User",
      table: "user",
      collections: {
        posts: {
          type: "owned",
          entity: "Post",
        },
      },
    })
    .register({
      entity: "Post",
      table: "post",
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
      fields: {
        content: "main_content",
      },
      parentFk: {
        field: "authorId",
        parentEntity: "User",
      },
    });

  protected readonly entityClasses = new Map<string, new () => any>([
    ["User", UserEntity],
    ["Post", PostEntity],
    ["Tag", TagEntity],
  ]);

  @Transactional()
  protected async onCreate(aggregate: User, em: EntityManager): Promise<void> {
    const userEntity = new UserEntity();
    userEntity.id = aggregate.id.value;
    userEntity.email = aggregate.email;
    userEntity.name = aggregate.name;
    userEntity.createdAt = aggregate.createdAt;
    userEntity.updatedAt = aggregate.updatedAt;
    await em.save(userEntity);

    for (const post of aggregate.posts) {
      const postEntity = new PostEntity();
      postEntity.id = post.id.value;
      postEntity.title = post.title;
      postEntity.mainContent = post.content;
      postEntity.published = post.published;
      postEntity.authorId = aggregate.id.value;
      postEntity.createdAt = post.createdAt;
      postEntity.updatedAt = post.updatedAt;
      await em.save(postEntity);

      if (post.tags.length > 0) {
        for (const tag of post.tags) {
          await em.query(
            `INSERT INTO "_PostToTag" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [postEntity.id, tag.id.value]
          );
        }
      }
    }
  }
}
