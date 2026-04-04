import { z } from "zod";
import { Criteria } from "@woltz/rich-domain";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const PostParamsSchema = z.object({
  id: z.string().uuid(),
});

const PostTagParamsSchema = z.object({
  postId: z.string().uuid(),
  tagId: z.string().uuid(),
});

const CreatePostBodySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  authorId: z.string().uuid(),
});

const UpdatePostBodySchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

const PostResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  published: z.boolean(),
  authorId: z.string(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  tags: z.array(z.object({ id: z.string() })),
});

const MessageResponseSchema = z.object({ message: z.string() });

export const postRoutes: FastifyPluginAsyncZod = async (app) => {
  const { postService } = app.container;

  app.post("/posts", {
    schema: {
      operationId: "createPost",
      body: CreatePostBodySchema,
      response: { "2xx": PostResponseSchema },
    },
    handler: async (request, reply) => {
      const post = await postService.create(request.body);
      return reply.status(201).send(post.toJSON());
    },
  });

  app.get("/posts/:id", {
    schema: {
      operationId: "getPostById",
      params: PostParamsSchema,
      response: { "2xx": PostResponseSchema },
    },
    handler: async (request) => {
      const post = await postService.getById(request.params.id);
      return post.toJSON();
    },
  });

  app.get("/posts", {
    schema: { operationId: "listPosts" },
    handler: async (request) => {
      const criteria = Criteria.fromQueryParams(
        request.query as Record<string, any>
      );
      const result = await postService.list(criteria);
      return result.toJSON();
    },
  });

  app.patch("/posts/:id", {
    schema: {
      operationId: "updatePost",
      params: PostParamsSchema,
      body: UpdatePostBodySchema,
      response: { "2xx": PostResponseSchema },
    },
    handler: async (request) => {
      const post = await postService.update(request.params.id, request.body);
      return post.toJSON();
    },
  });

  app.patch("/posts/:id/publish", {
    schema: {
      operationId: "publishPost",
      params: PostParamsSchema,
      response: { "2xx": PostResponseSchema },
    },
    handler: async (request) => {
      const post = await postService.publish(request.params.id);
      return post.toJSON();
    },
  });

  app.patch("/posts/:id/tags", {
    schema: {
      operationId: "addTagToPost",
      params: PostParamsSchema,
      body: z.object({ tagId: z.string().uuid() }),
      response: { "2xx": MessageResponseSchema },
    },
    handler: async (request, reply) => {
      await postService.addTag(request.params.id, request.body.tagId);
      return reply.send({ message: "Tag added successfully" });
    },
  });

  app.delete("/posts/:postId/tags/:tagId", {
    schema: {
      operationId: "removeTagFromPost",
      params: PostTagParamsSchema,
      response: { "2xx": MessageResponseSchema },
    },
    handler: async (request, reply) => {
      await postService.removeTag(request.params.postId, request.params.tagId);
      return reply.send({ message: "Tag removed successfully" });
    },
  });
};
