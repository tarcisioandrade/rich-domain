import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Criteria } from "@woltz/rich-domain";
import { ZodTypeProvider } from "fastify-type-provider-zod";

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  authorId: z.string().uuid(),
});

const postParamsSchema = z.object({
  id: z.string().uuid(),
});

const postTagParamsSchema = z.object({
  postId: z.string().uuid(),
  tagId: z.string().uuid(),
});

const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
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
      const { id } = postParamsSchema.parse(request.params);
      const post = await postService.getById(id);
      return reply.send(post.toJSON());
    } catch (error) {
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Not found",
      });
    }
  });

  app.get("/posts", async (request, reply) => {
    try {
      const criteria = Criteria.fromQueryParams(
        request.query as Record<string, any>
      );
      const result = await postService.list(criteria);
      return reply.send(result.toJSON());
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.patch("/posts/:id", async (request, reply) => {
    try {
      const { id } = postParamsSchema.parse(request.params);
      const body = updatePostSchema.parse(request.body);
      const post = await postService.update(id, body);
      return reply.send(post);
    } catch (error) {
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Not found",
      });
    }
  });

  app.patch("/posts/:id/publish", async (request, reply) => {
    try {
      const { id } = postParamsSchema.parse(request.params);
      const post = await postService.publish(id);
      return reply.send(post.toJSON());
    } catch (error) {
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Not found",
      });
    }
  });

  app.withTypeProvider<ZodTypeProvider>().patch("/posts/:id/tags", {
    schema: { body: z.object({ tagId: z.string().uuid() }) },
    handler: async (request, reply) => {
      try {
        const { id } = postParamsSchema.parse(request.params);
        await postService.addTag(id, request.body.tagId);
        return reply.send({ message: "Tag added successfully" });
      } catch (error) {
        return reply.status(404).send({
          error: error instanceof Error ? error.message : "Not found",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().delete("/posts/:postId/tags/:tagId", {
    schema: { params: postTagParamsSchema },
    handler: async (request, reply) => {
      try {
        await postService.removeTag(
          request.params.postId,
          request.params.tagId
        );
        return reply.send({ message: "Tag removed successfully" });
      } catch (error) {
        return reply.status(404).send({
          error: error instanceof Error ? error.message : "Not found",
        });
      }
    },
  });
};
