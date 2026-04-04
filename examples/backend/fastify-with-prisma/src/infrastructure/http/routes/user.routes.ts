import { z } from "zod";
import { Criteria } from "@woltz/rich-domain";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  CriteriaQuerySchema,
  PaginatedResponseSchema,
  defineFilters,
} from "@woltz/rich-domain-criteria-zod";

const UserParamsSchema = z.object({
  id: z.string().uuid(),
});

const CreateUserBodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const UpdateNameBodySchema = z.object({
  name: z.string().min(1),
});

const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  posts: z.array(z.object({ title: z.string(), content: z.string() })),
});

const MessageResponseSchema = z.object({ message: z.string() });

const usersQueryParams = defineFilters((q) => ({
  name: q.string(),
  email: q.string(),
  "posts.title": q.array.string(),
}));

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  const { userService } = app.container;

  app.post("/users", {
    schema: {
      operationId: "createUser",
      body: CreateUserBodySchema,
      response: { "2xx": UserResponseSchema },
    },
    handler: async (request) => {
      const user = await userService.create(request.body);
      return user.toJSON();
    },
  });

  app.get("/users/:id", {
    schema: {
      operationId: "getUserById",
      params: UserParamsSchema,
      response: { "2xx": UserResponseSchema },
    },
    handler: async (request) => {
      const user = await userService.getById(request.params.id);
      return user.toJSON();
    },
  });

  app.route({
    method: "GET",
    url: "/users",
    schema: {
      operationId: "listUsers",
      querystring: CriteriaQuerySchema(usersQueryParams, {
        orderBy: ["name", "email", "id"],
      }),
      response: {
        "2xx": PaginatedResponseSchema(UserResponseSchema),
      },
    },
    handler: async (request) => {
      const criteria = Criteria.fromQueryParams(request.query);
      const users = await userService.list(criteria);
      return users.toJSON();
    },
  });

  app.patch("/users/:id/name", {
    schema: {
      operationId: "updateUserName",
      params: UserParamsSchema,
      body: UpdateNameBodySchema,
      response: { "2xx": MessageResponseSchema },
    },
    handler: async (request) => {
      await userService.changeName(request.params.id, request.body.name);
      return { message: "Name updated successfully" };
    },
  });
};
