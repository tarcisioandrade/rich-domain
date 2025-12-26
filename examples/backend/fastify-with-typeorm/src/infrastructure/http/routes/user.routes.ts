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
  email: z.email(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  posts: z.array(z.object({ title: z.string(), content: z.string() })),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  const { userService } = app.container;

  app.post("/users", async (request, reply) => {
    try {
      const body = createUserSchema.parse(request.body);
      const user = await userService.create(body);

      return reply.status(201).send(user.toJSON());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/users/:id", async (request, reply) => {
    try {
      const params = getUserParamsSchema.parse(request.params);
      const user = await userService.getById(params.id);

      return reply.send(user.toJSON());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const usersQueryParams = defineFilters((q) => ({
    name: q.string(),
    email: q.string(),
    "posts.title": q.array.string(),
    createdAt: q.date(),
  }));

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/users",
    schema: {
      querystring: CriteriaQuerySchema(usersQueryParams, {
        orderBy: ["name", "email", "id"],
      }),
      response: {
        "2xx": PaginatedResponseSchema(UserResponseSchema),
        "4xx": z.object({ error: z.any() }),
      },
    },
    handler: async (request, reply) => {
      try {
        const criteria = Criteria.fromQueryParams(request.query);
        const users = await userService.list(criteria);

        return reply.send(users.toJSON());
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: z.treeifyError(error) });
        }
        return reply.status(500).send({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });

  app.patch("/users/:id/name", async (request, reply) => {
    try {
      const params = getUserParamsSchema.parse(request.params);
      const body = updateNameSchema.parse(request.body);
      await userService.changeName(params.id, body.name);

      return reply.send({ message: "Name updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
};
