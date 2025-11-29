import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PrismaPostRepository } from "../../repositories/prisma-post.repository";
import { PrismaUserRepository } from "../../repositories/prisma-user.repository";
import { PrismaPostToPersistenceMapper } from "../../database/mappers/post-to-persistence.mapper";
import { PrismaPostToDomainMapper } from "../../database/mappers/post-to-domain.mapper";
import { PrismaUserToPersistenceMapper } from "../../database/mappers/user-to-persistence.mapper";
import { PrismaUserToDomainMapper } from "../../database/mappers/user-to-domain.mapper";
import { Criteria } from "@woltz/rich-domain";
import { prisma } from "../../database/prisma";
import { PostSchema } from "../../../domain/post/post.entity";
import { PrismaUnitOfWork } from "../../database/unit-of-work";
import { PostService } from "../../../application/services/post.service";

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
    new PrismaUserToPersistenceMapper(prisma, uow),
    new PrismaUserToDomainMapper(),
    prisma,
    uow
  );
  const postService = new PostService(postRepository, userRepository);

  app.post("/posts", async (request, reply) => {
    try {
      const body = createPostSchema.parse(request.body);
      const post = await postService.create(body);

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
      const post = await postService.getById(params.id);

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
      const query = request.query as Record<string, any>;
      const criteria = Criteria.fromQueryParams(query);
      const posts = await postService.list(criteria);

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
      const post = await postService.publish(params.id);

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
      await postService.update(params.id, body);

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
