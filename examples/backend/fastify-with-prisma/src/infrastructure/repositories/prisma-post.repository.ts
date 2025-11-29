import { PostRepository } from "../../domain/post/post.repository";
import { Post } from "../../domain/post/post.entity";
import { PostSchema } from "../database/schemas/post.schema";
import { PrismaRepository } from "../database/prisma.repository";
import { PrismaPostToDomainMapper } from "../database/mappers/post-to-domain.mapper";
import { PrismaPostToPersistenceMapper } from "../database/mappers/post-to-persistence.mapper";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaUnitOfWork } from "../database/unit-of-work";

export class PrismaPostRepository
  extends PrismaRepository<Post, PostSchema>
  implements PostRepository
{
  constructor(
    protected readonly mapperToPersistence: PrismaPostToPersistenceMapper,
    protected readonly mapperToDomain: PrismaPostToDomainMapper,
    prisma: PrismaClient,
    uow: PrismaUnitOfWork
  ) {
    super(mapperToPersistence, mapperToDomain, prisma, uow);
  }

  get model() {
    return "post";
  }

  protected includes = {} satisfies Prisma.PostInclude;
}
