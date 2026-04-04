import { z } from "zod";
import { Criteria } from "@woltz/rich-domain";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const PostParamsSchema = z.object({
  id: z.string(),
});

const PostTagParamsSchema = z.object({
  postId: z.string(),
  tagId: z.string(),
});

const CreatePostBodySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  authorId: z.string(),
  tagsId: z.array(z.string()).optional(),
});

const UpdatePostBodySchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

const MessageResponseSchema = z.object({ message: z.string() });

export const postRoutes: FastifyPluginAsyncZod = async (app) => {
  const { postService } = app.container;

  app.post("/posts", {
    schema: {
      operationId: "createPost",
      body: CreatePostBodySchema,
    },
    handler: async (request) => {
      const post = await postService.create(request.body);
      return post.toJSON();
    },
  });

  app.get("/posts/:id", {
    schema: {
      operationId: "getPostById",
      params: PostParamsSchema,
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
      const posts = await postService.list(criteria);
      return posts.toJSON();
    },
  });

  app.patch("/posts/:id", {
    schema: {
      operationId: "updatePost",
      params: PostParamsSchema,
      body: UpdatePostBodySchema,
    },
    handler: async (request) => {
      await postService.update(request.params.id, request.body);
      return { message: "Post updated successfully" };
    },
  });

  app.patch("/posts/:id/publish", {
    schema: {
      operationId: "publishPost",
      params: PostParamsSchema,
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
      body: z.object({ tagId: z.string() }),
      response: { "2xx": MessageResponseSchema },
    },
    handler: async (request) => {
      await postService.addTag(request.params.id, request.body.tagId);
      return { message: "Tag added successfully" };
    },
  });

  app.delete("/posts/:postId/tags/:tagId", {
    schema: {
      operationId: "removeTagFromPost",
      params: PostTagParamsSchema,
      response: { "2xx": MessageResponseSchema },
    },
    handler: async (request) => {
      await postService.removeTag(request.params.postId, request.params.tagId);
      return { message: "Tag removed successfully" };
    },
  });
};
