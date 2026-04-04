import { eq } from "drizzle-orm";
import { DrizzleRepository, DrizzleUnitOfWork, SearchableField } from "@woltz/rich-domain-drizzle";
import { User } from "../../../domain/user/user.entity";
import { UserRepository } from "../../../domain/user/user.repository";
import { UserToDomainMapper } from "../mappers/user-to-domain.mapper";
import { UserToPersistenceMapper } from "../mappers/user-to-persistence.mapper";
import { users, UserRecord } from "../schema";
import { getDb } from "../db";

export class DrizzleUserRepository
  extends DrizzleRepository<User, UserRecord>
  implements UserRepository
{
  constructor(uow: DrizzleUnitOfWork) {
    const db = getDb() as any;
    super({
      db,
      table: users,
      toDomainMapper: new UserToDomainMapper(),
      toPersistenceMapper: new UserToPersistenceMapper(uow),
      uow,
    });
  }

  protected get model() {
    return "users";
  }

  protected getSearchableFields(): SearchableField<UserRecord>[] {
    return ["name", "email"];
  }

  protected getDefaultRelations() {
    return {
      posts: {
        with: { tags: { with: { tag: true } } },
      },
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.context.query.users.findFirst({
      where: eq(users.email, email),
      with: this.getDefaultRelations(),
    });

    if (!record) return null;

    const user = this.toDomainMapper.build(record as any);
    user.markAsClean();
    return user;
  }
}
