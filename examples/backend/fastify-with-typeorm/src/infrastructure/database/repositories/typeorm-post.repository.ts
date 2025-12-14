import {
  SearchableField,
  TypeORMRepository,
  TypeORMUnitOfWork,
} from "@woltz/rich-domain-typeorm";
import { Repository } from "typeorm";
import { PostEntity } from "../models";
import { Post } from "../../../domain/post/post.entity";
import { PostToDomainMapper } from "../mappers/post-to-domain.mapper";
import { PostToPersistenceMapper } from "../mappers/post-to-persistence.mapper";
import { PostRepository } from "../../../domain/post/post.repository";
import { Criteria } from "@woltz/rich-domain";

export class TypeORMPostRepository
  extends TypeORMRepository<Post, PostEntity>
  implements PostRepository
{
  constructor(repo: Repository<PostEntity>, uow: TypeORMUnitOfWork) {
    super({
      typeormRepository: repo,
      toDomainMapper: new PostToDomainMapper(),
      toPersistenceMapper: new PostToPersistenceMapper(uow),
      uow,
    });
  }

  protected getSearchableFields(): SearchableField<PostEntity>[] {
    return [
      "title",
      { field: "mainContent", caseSensitive: false },
      "author.name",
    ];
  }

  protected getDefaultRelations(): string[] {
    return ["tags"];
  }

  override async find(criteria: Criteria<Post> = Criteria.create<Post>()) {
    criteria.orderByDesc("createdAt");
    return super.find(criteria);
  }
}
