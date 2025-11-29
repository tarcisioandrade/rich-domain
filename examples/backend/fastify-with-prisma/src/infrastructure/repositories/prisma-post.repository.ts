import { PostRepository } from "../../domain/post/post.repository";
import { Post } from "../../domain/post/post.entity";
import { PostSchema } from "../database/schemas/post.schema";
import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";
import { PrismaPostToPersistenceMapper } from "../database/mappers/post-to-persistence.mapper";
import { PrismaClient } from "@prisma/client";
import { PrismaPostToDomainMapper } from "../database/mappers/post-to-domain.mapper";

export class PrismaPostRepository
  extends PrismaRepository<Post, PostSchema>
  implements PostRepository
{
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
