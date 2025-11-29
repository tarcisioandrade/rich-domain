import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PrismaUserRepository } from "../../repositories/prisma-user.repository";
import { Criteria } from "@woltz/rich-domain";
import { prisma } from "../../database/prisma";
import { Prisma, User } from "@prisma/client";
import { CriteriaAdapter } from "@woltz/rich-domain/dist/types";
import { UserService } from "../../../application/services/user.service";
import { PrismaUnitOfWork } from "@woltz/rich-domain-prisma";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const getUserParamsSchema = z.object({
  id: z.string().uuid(),
});

const changeNameSchema = z.object({
  name: z.string().min(1),
});

type UserListDto = User & {
  fullName: string;
  posts: { title: string; mainContent: string }[];
};

type UserWithPosts = Prisma.UserGetPayload<{
  include: {
    posts: true;
  };
}>;

const UserListAdapter: CriteriaAdapter<UserListDto, UserWithPosts> = {
  fullName: "name",
  "posts.mainContent": "posts.main_content",
};

export async function userRoutes(app: FastifyInstance) {
  const uow = new PrismaUnitOfWork(prisma);
  const userRepository = new PrismaUserRepository(prisma, uow);
  const userService = new UserService(userRepository, uow);

  app.post("/users", async (request, reply) => {
    try {
      const body = createUserSchema.parse(request.body);
      const user = await userService.create(body);

      return reply.status(201).send(user.toJson());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/users", async (request, reply) => {
    try {
      const query = request.query as Record<string, any>;
      const criteria = Criteria.fromQueryParams(query, UserListAdapter);
      const users = await userService.list(criteria);

      return reply.send(users.map((user) => user.toJson()));
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.patch("/users/:id", async (request, reply) => {
    try {
      const params = getUserParamsSchema.parse(request.params);
      const body = changeNameSchema.parse(request.body);
      await userService.changeName(params.id, body.name);

      return reply.send({ message: "Name changed successfully" });
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
