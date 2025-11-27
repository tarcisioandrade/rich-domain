import { UserRepository } from "../../domain/user/user.repository";
import { User } from "../../domain/user/user.entity";
import { UserSchema } from "../database/schemas/user.schema";
import { PrismaRepository } from "../database/prisma.repository";
import { PrismaUserToDomainMapper } from "../database/mappers/user-to-domain.mapper";
import { PrismaUserToPersistenceMapper } from "../database/mappers/user-to-persistence.mapper";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaUnitOfWork } from "../database/unit-of-work";

export class PrismaUserRepository
  extends PrismaRepository<User, UserSchema>
  implements UserRepository
{
  constructor(
    protected readonly mapperToPersistence: PrismaUserToPersistenceMapper,
    protected readonly mapperToDomain: PrismaUserToDomainMapper,
    prisma: PrismaClient,
    uow: PrismaUnitOfWork
  ) {
    super(mapperToPersistence, mapperToDomain, prisma, uow);
  }

  get model() {
    return "user";
  }

  protected includes = {
    posts: true,
  } satisfies Prisma.UserInclude;

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.context.user.findUnique({
      where: { email },
      include: this.includes,
    });

    return user ? this.mapperToDomain.build(user) : null;
  }
}
