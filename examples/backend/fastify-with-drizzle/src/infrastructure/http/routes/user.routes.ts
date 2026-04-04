import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Criteria } from "@woltz/rich-domain";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  CriteriaQuerySchema,
  PaginatedResponseSchema,
  defineFilters,
} from "@woltz/rich-domain-criteria-zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const getUserParamsSchema = z.object({
  id: z.string().uuid(),
});

const updateNameSchema = z.object({
  name: z.string().min(1),
});

const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  posts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      published: z.boolean(),
    })
  ),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  const { userService } = app.container;

  app.post("/users", async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const user = await userService.create(body);
    return user.toJSON();
  });

  app.get("/users/:id", async (request) => {
    const { id } = getUserParamsSchema.parse(request.params);
    const user = await userService.getById(id);
    return user.toJSON();
  });

  const usersQueryParams = defineFilters((q) => ({
    name: q.string(),
    email: q.string(),
    createdAt: q.date(),
  }));

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/users",
    schema: {
      querystring: CriteriaQuerySchema(usersQueryParams, {
        orderBy: ["name", "email", "id", "createdAt"],
      }),
      response: {
        "2xx": PaginatedResponseSchema(UserResponseSchema),
      },
    },
    handler: async (request) => {
      const criteria = Criteria.fromQueryParams(request.query);
      const result = await userService.list(criteria);
      return result.toJSON();
    },
  });

  app.patch("/users/:id/name", async (request, reply) => {
    try {
      const { id } = getUserParamsSchema.parse(request.params);
      const { name } = updateNameSchema.parse(request.body);
      await userService.changeName(id, name);
      return reply.send({ message: "Name updated successfully" });
    } catch (error) {
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
};
