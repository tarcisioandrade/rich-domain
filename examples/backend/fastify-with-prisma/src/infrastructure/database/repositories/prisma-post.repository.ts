import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";
import { PostRepository } from "../../../domain/post/post.repository";
import { PrismaPostToDomainMapper } from "../mappers/post-to-domain.mapper";
import { PrismaPostToPersistenceMapper } from "../mappers/post-to-persistence.mapper";
import { PostSchema } from "../schemas/post.schema";
import { Post } from "../../../domain/post/post.entity";
import { Criteria, PaginatedResult } from "@woltz/rich-domain";

export class PrismaPostRepository
  extends PrismaRepository<Post, PostSchema, PrismaClient>
  implements PostRepository
{
  protected includes = {
    tags: true,
  } satisfies Prisma.PostInclude;

  protected generateSearchQuery(s: string) {
    const search = {
      contains: s,
      mode: "insensitive",
    } as const;

    return [
      {
        title: search,
      },
      {
        main_content: search,
      },
      {
        author: {
          name: search,
        },
      },
    ] satisfies Prisma.PostWhereInput[];
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

  override async find(
    criteria: Criteria<Post>
  ): Promise<PaginatedResult<Post>> {
    criteria.orderByDesc("createdAt");
    return super.find(criteria);
  }
}
