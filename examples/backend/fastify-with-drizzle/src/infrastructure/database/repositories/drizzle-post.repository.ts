import {
  DrizzleRepository,
  DrizzleUnitOfWork,
  SearchableField,
} from "@woltz/rich-domain-drizzle";
import { Criteria } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import { PostRepository } from "../../../domain/post/post.repository";
import { PostToDomainMapper } from "../mappers/post-to-domain.mapper";
import { PostToPersistenceMapper } from "../mappers/post-to-persistence.mapper";
import { posts, PostRecord } from "../schema";
import { DB } from "../db";

export class DrizzlePostRepository
  extends DrizzleRepository<Post, PostRecord, DB>
  implements PostRepository
{
  constructor(db: DB, uow: DrizzleUnitOfWork) {
    super({
      db,
      table: posts,
      toDomainMapper: new PostToDomainMapper(),
      toPersistenceMapper: new PostToPersistenceMapper(db, uow),
      uow,
    });
  }

  protected get model() {
    return "posts";
  }

  protected getSearchableFields(): SearchableField<PostRecord>[] {
    return ["title", "content"];
  }

  protected getDefaultRelations() {
    return {
      tags: { with: { tag: true } },
    } as const;
  }

  override async find(criteria: Criteria<Post> = Criteria.create<Post>()) {
    criteria.orderByDesc("createdAt");
    return super.find(criteria);
  }
}
