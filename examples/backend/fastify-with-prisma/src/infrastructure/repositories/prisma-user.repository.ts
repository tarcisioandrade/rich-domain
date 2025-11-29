import { UserRepository } from "../../domain/user/user.repository";
import { User } from "../../domain/user/user.entity";
import { UserSchema } from "../database/schemas/user.schema";
import { PrismaUserToDomainMapper } from "../database/mappers/user-to-domain.mapper";
import { PrismaUserToPersistenceMapper } from "../database/mappers/user-to-persistence.mapper";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";

export class PrismaUserRepository
  extends PrismaRepository<User, UserSchema>
  implements UserRepository
{
  protected get model() {
    return "user";
  }

  protected readonly includes = {
    posts: true,
  } satisfies Prisma.UserInclude;

  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {
    super(
      new PrismaUserToPersistenceMapper(prisma, uow),
      new PrismaUserToDomainMapper(),
      prisma,
      uow
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.context.user.findUnique({
      where: { email },
      include: this.includes,
    });

    return user ? this.mapperToDomain.build(user) : null;
  }
}
