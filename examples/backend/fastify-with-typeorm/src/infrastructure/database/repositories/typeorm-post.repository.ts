import {
  TypeORMRepository,
  TypeORMUnitOfWork,
} from "@woltz/rich-domain-typeorm";
import { Repository } from "typeorm";
import { PostEntity } from "../models";
import { Post } from "../../../domain/post/post.entity";
import { PostToDomainMapper } from "../mappers/post-to-domain.mapper";
import { PostToPersistenceMapper } from "../mappers/post-to-persistence.mapper";
import { PostRepository } from "../../../domain/post/post.repository";

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
}
