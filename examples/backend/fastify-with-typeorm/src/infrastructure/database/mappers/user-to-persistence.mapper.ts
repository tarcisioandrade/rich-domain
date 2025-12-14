import { User } from "../../../domain/user/user.entity";
import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { TypeORMToPersistence } from "@woltz/rich-domain-typeorm";
import { UserEntity } from "../models/User";
import { PostEntity } from "../models/Post";
import { TagEntity } from "../models/Tag";
import { EntityManager } from "typeorm/entity-manager/EntityManager.js";

export class UserToPersistenceMapper extends TypeORMToPersistence<User> {
  protected readonly registry = new EntitySchemaRegistry()
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
          junction: {
            table: "_PostToTag",
            sourceKey: "id",
            targetKey: "id",
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

  protected readonly entityClasses = new Map([
    ["User", UserEntity as any],
    ["Post", PostEntity],
    ["Tag", TagEntity],
  ]);

  protected async onCreate(aggregate: User, em: EntityManager): Promise<void> {
    const entity = new UserEntity();

    entity.id = aggregate.id.value;
    entity.email = aggregate.email;
    entity.name = aggregate.name;
    entity.createdAt = aggregate.createdAt;
    entity.updatedAt = aggregate.updatedAt;

    await em.save(entity);
  }
}
