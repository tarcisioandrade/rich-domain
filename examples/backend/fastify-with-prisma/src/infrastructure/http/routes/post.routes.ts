import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PrismaPostRepository } from "../../repositories/prisma-post.repository";
import { PrismaUserRepository } from "../../repositories/prisma-user.repository";
import { CreatePostUseCase } from "../../../application/use-cases/post/create-post.use-case";
import { GetPostUseCase } from "../../../application/use-cases/post/get-post.use-case";
import { ListPostsUseCase } from "../../../application/use-cases/post/list-posts.use-case";
import { PublishPostUseCase } from "../../../application/use-cases/post/publish-post.use-case";
import { PrismaPostToPersistenceMapper } from "../../database/mappers/post-to-persistence.mapper";
import { PrismaPostToDomainMapper } from "../../database/mappers/post-to-domain.mapper";
import { PrismaUserToPersistenceMapper } from "../../database/mappers/user-to-persistence.mapper";
import { PrismaUserToDomainMapper } from "../../database/mappers/user-to-domain.mapper";
import { Criteria } from "@woltz/rich-domain";
import { prisma } from "../../database/prisma";
import { UpdatePostUseCase } from "../../../application/use-cases/post/update-post.use-case";
import { PostSchema } from "../../../domain/post/post.entity";
import { PrismaUnitOfWork } from "../../database/unit-of-work";

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  authorId: z.string().uuid(),
});

const OnlyIdSchema = z.object({
  id: z.string().uuid(),
});

const getPostParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function postRoutes(app: FastifyInstance) {
  const uow = new PrismaUnitOfWork(prisma);
  const postRepository = new PrismaPostRepository(
    new PrismaPostToPersistenceMapper(prisma),
    new PrismaPostToDomainMapper(),
    prisma,
    uow
  );
  const userRepository = new PrismaUserRepository(
    new PrismaUserToPersistenceMapper(prisma),
    new PrismaUserToDomainMapper(),
    prisma,
    uow
  );

  app.post("/posts", async (request, reply) => {
    try {
      const body = createPostSchema.parse(request.body);
      const createPostUseCase = new CreatePostUseCase(
        postRepository,
        userRepository
      );
      const post = await createPostUseCase.execute(body);

      return reply.status(201).send(post.toJson());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/posts/:id", async (request, reply) => {
    try {
      const params = getPostParamsSchema.parse(request.params);
      const getPostUseCase = new GetPostUseCase(postRepository);
      const post = await getPostUseCase.execute(params.id);

      return reply.send(post.toJson());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/posts", async (request, reply) => {
    try {
      const listPostsUseCase = new ListPostsUseCase(postRepository);
      const query = request.query as Record<string, any>;
      const criteria = Criteria.fromQueryParams(query);
      const posts = await listPostsUseCase.execute(criteria);

      return reply.send(posts.map((post) => post.toJson()));
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.patch("/posts/:id/publish", async (request, reply) => {
    try {
      const params = getPostParamsSchema.parse(request.params);
      const publishPostUseCase = new PublishPostUseCase(postRepository);
      const post = await publishPostUseCase.execute(params.id);

      return reply.send(post.toJson());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.patch("/posts/:id", async (request, reply) => {
    try {
      const params = OnlyIdSchema.parse(request.params);
      const body = PostSchema.partial().parse(request.body);
      const updatePostUseCase = new UpdatePostUseCase(postRepository);
      await updatePostUseCase.execute(params.id, body);

      return reply.send({ message: "Post updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
