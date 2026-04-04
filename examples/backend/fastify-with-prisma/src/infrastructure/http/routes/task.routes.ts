import { z } from "zod";
import { Criteria } from "@woltz/rich-domain";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  CriteriaQuerySchema,
  PaginatedResponseSchema,
  defineFilters,
} from "@woltz/rich-domain-criteria-zod";

const TaskParamsSchema = z.object({
  id: z.string().uuid(),
});

const CreateTaskBodySchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  assignee: z.string(),
  labels: z.array(z.string()),
  order: z.string(),
});

const UpdateTaskBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  labels: z.array(z.string()).optional(),
  order: z.string().optional(),
});

const MoveTaskBodySchema = z.object({
  newStatus: z.enum(["todo", "doing", "done", "archived", "cancelled"]),
  insertAfterId: z.string().uuid().nullable(),
});

const TaskResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  assignee: z.string(),
  labels: z.array(z.string()),
  order: z.string(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  updatedStageAt: z.union([z.date(), z.string()]).nullable(),
});

const MessageResponseSchema = z.object({ message: z.string() });

const tasksQueryParams = defineFilters((q) => ({
  title: q.string(),
  description: q.string(),
  status: q.string(),
  priority: q.string(),
  assignee: q.string(),
  labels: q.array.string(),
  order: q.string(),
}));

export const taskRoutes: FastifyPluginAsyncZod = async (app) => {
  const { taskService } = app.container;

  app.post("/tasks", {
    schema: {
      operationId: "createTask",
      body: CreateTaskBodySchema,
      response: { "2xx": TaskResponseSchema },
    },
    handler: async (request, reply) => {
      const task = await taskService.create(request.body);
      return reply.status(201).send(task.toJSON());
    },
  });

  app.get("/tasks/:id", {
    schema: {
      operationId: "getTaskById",
      params: TaskParamsSchema,
      response: { "2xx": TaskResponseSchema },
    },
    handler: async (request) => {
      const task = await taskService.getById(request.params.id);
      return task.toJSON();
    },
  });

  app.route({
    method: "GET",
    url: "/tasks",
    schema: {
      operationId: "listTasks",
      querystring: CriteriaQuerySchema(tasksQueryParams, {
        orderBy: ["title", "status", "priority", "assignee", "order", "id"],
      }),
      response: {
        "2xx": PaginatedResponseSchema(TaskResponseSchema),
      },
    },
    handler: async (request) => {
      const criteria = Criteria.fromQueryParams(request.query);
      const tasks = await taskService.list(criteria);
      return tasks.toJSON();
    },
  });

  app.patch("/tasks/:id", {
    schema: {
      operationId: "updateTask",
      params: TaskParamsSchema,
      body: UpdateTaskBodySchema,
      response: { "2xx": TaskResponseSchema },
    },
    handler: async (request) => {
      const task = await taskService.update(request.params.id, request.body);
      return task.toJSON();
    },
  });

  app.delete("/tasks/:id", {
    schema: {
      operationId: "deleteTask",
      params: TaskParamsSchema,
      response: { "2xx": MessageResponseSchema },
    },
    handler: async (request, reply) => {
      await taskService.delete(request.params.id);
      return reply.send({ message: "Task deleted successfully" });
    },
  });

  app.put("/tasks/:id/move", {
    schema: {
      operationId: "moveTask",
      params: TaskParamsSchema,
      body: MoveTaskBodySchema,
      response: { "2xx": TaskResponseSchema },
    },
    handler: async (request) => {
      const task = await taskService.moveTask(
        request.params.id,
        request.body.newStatus,
        request.body.insertAfterId
      );
      return task.toJSON();
    },
  });
};
