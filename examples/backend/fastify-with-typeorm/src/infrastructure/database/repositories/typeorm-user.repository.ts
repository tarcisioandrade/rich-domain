import {
  SearchableField,
  TypeORMRepository,
  TypeORMUnitOfWork,
} from "@woltz/rich-domain-typeorm";
import { User } from "../../../domain/user/user.entity";
import { Repository } from "typeorm";
import { UserEntity } from "../models/User";
import { UserToDomainMapper } from "../mappers/user-to-domain.mapper";
import { UserToPersistenceMapper } from "../mappers/user-to-persistence.mapper";
import { UserRepository } from "../../../domain/user/user.repository";

export class TypeORMUserRepository
  extends TypeORMRepository<User, UserEntity>
  implements UserRepository
{
  constructor(repo: Repository<UserEntity>, uow: TypeORMUnitOfWork) {
    super({
      typeormRepository: repo,
      toDomainMapper: new UserToDomainMapper(),
      toPersistenceMapper: new UserToPersistenceMapper(uow),
      uow,
    });
  }

  protected getSearchableFields(): SearchableField<UserEntity>[] {
    return ["name", "email", "posts.title", "posts.mainContent"];
  }

  protected getDefaultRelations(): string[] {
    return ["posts", "posts.tags"];
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.typeormRepo.findOne({
      where: { email },
      relations: this.getDefaultRelations(),
    });
    return user ? this.toDomainMapper.build(user) : null;
  }
}
