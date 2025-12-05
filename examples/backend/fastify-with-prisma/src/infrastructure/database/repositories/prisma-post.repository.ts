import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";
import { PostRepository } from "../../../domain/post/post.repository";
import { PrismaPostToDomainMapper } from "../mappers/post-to-domain.mapper";
import { PrismaPostToPersistenceMapper } from "../mappers/post-to-persistence.mapper";
import { PostSchema } from "../schemas/post.schema";
import { Post } from "../../../domain/post/post.entity";

export class PrismaPostRepository
  extends PrismaRepository<Post, PostSchema>
  implements PostRepository
{
  protected includes = {
    tags: true,
  } satisfies Prisma.PostInclude;

  protected generateSearchQuery(search: string) {
    return {
      title: { contains: search, mode: "insensitive" },
    };
  }

  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {
    super(
      new PrismaPostToPersistenceMapper(prisma, uow),
      new PrismaPostToDomainMapper(),
      prisma,
      uow
    );
  }

  get model() {
    return "post";
  }
}
