import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { TypeORMPostRepository } from "../../database/repositories/typeorm-post.repository";
import { TypeORMUserRepository } from "../../database/repositories/typeorm-user.repository";
import { Criteria } from "@woltz/rich-domain";
import { getDataSource, getUoW } from "../../database/data-source";
import { PostSchema } from "../../../domain/post/post.entity";
import { PostService } from "../../../application/services/post.service";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { PostEntity, UserEntity } from "../../database/models";

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  authorId: z.string(),
});

const OnlyIdSchema = z.object({
  id: z.string(),
});

const getPostParamsSchema = z.object({
  id: z.string(),
});

export const postRoutes: FastifyPluginAsync = async (app) => {
  const { postService } = app.container;

  app.post("/posts", async (request, reply) => {
    try {
      const body = createPostSchema.parse(request.body);
      const post = await postService.create(body);

      return reply.status(201).send(post.toJSON());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
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

      return reply.send(post.toJSON());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
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

      return reply.send(posts.map((post) => post.toJSON()));
    } catch (error) {
      return reply.status(500).send({
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
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.patch("/posts/:id/publish", async (request, reply) => {
    try {
      const params = getPostParamsSchema.parse(request.params);
      const post = await postService.publish(params.id);

      return reply.send(post.toJSON());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.withTypeProvider<ZodTypeProvider>().patch("/posts/:id/tags", {
    schema: {
      body: z.object({
        tagId: z.string(),
      }),
    },
    handler: async (request, reply) => {
      try {
        const params = getPostParamsSchema.parse(request.params);
        await postService.addTag(params.id, request.body.tagId);

        return reply.send({ message: "Tag added successfully" });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: z.treeifyError(error) });
        }
        return reply.status(404).send({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().delete("/posts/:postId/tags/:tagId", {
    schema: {
      params: z.object({
        postId: z.string(),
        tagId: z.string(),
      }),
    },
    handler: async (request, reply) => {
      try {
        await postService.removeTag(
          request.params.postId,
          request.params.tagId
        );

        return reply.send({ message: "Tag removed successfully" });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: z.treeifyError(error) });
        }
        return reply.status(404).send({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}
