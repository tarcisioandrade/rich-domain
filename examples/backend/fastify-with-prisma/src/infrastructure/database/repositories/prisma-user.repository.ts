import { Prisma, PrismaClient } from "@prisma/client";
import {
  PrismaRepository,
  PrismaUnitOfWork,
  PrismaOutboxStore,
} from "@woltz/rich-domain-prisma";
import { UserRepository } from "../../../domain/user/user.repository";
import { PrismaUserToDomainMapper } from "../mappers/user-to-domain.mapper";
import { PrismaUserToPersistenceMapper } from "../mappers/user-to-persistence.mapper";
import { UserSchema } from "../schemas/user.schema";
import { User } from "../../../domain/user/user.entity";

export class PrismaUserRepository
  extends PrismaRepository<User, UserSchema, PrismaClient>
  implements UserRepository
{
  protected get model() {
    return "user";
  }

  protected generateSearchQuery(search: string) {
    return [
      {
        name: { contains: search, mode: "insensitive" },
      },
    ] satisfies Prisma.UserWhereInput[];
  }

  protected readonly includes = {
    posts: {
      include: {
        tagPosts: {
          include: {
            tag: true,
          },
        },
      },
    },
  } satisfies Prisma.UserInclude;

  constructor(
    prisma: PrismaClient,
    uow: PrismaUnitOfWork,
    outboxStore?: PrismaOutboxStore
  ) {
    super(
      new PrismaUserToPersistenceMapper(prisma, uow),
      new PrismaUserToDomainMapper(),
      prisma,
      uow,
      outboxStore
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.context.user.findUnique({
      where: { email },
      include: this.includes,
    });

    return user ? this.toDomainMapper.build(user) : null;
  }
}
