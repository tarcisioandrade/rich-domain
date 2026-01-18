import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Criteria } from "@woltz/rich-domain";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  CriteriaQuerySchema,
  PaginatedResponseSchema,
  defineFilters,
} from "@woltz/rich-domain-criteria-zod";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  assignee: z.string(),
  labels: z.array(z.string()),
  order: z.string(),
});

const getTaskParamsSchema = z.object({
  id: z.string().uuid(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  labels: z.array(z.string()).optional(),
  order: z.string().optional(),
});

const moveTaskSchema = z.object({
  newStatus: z.enum(["todo", "doing", "done"]),
  proposedOrder: z.string(),
  prevOrder: z.string().nullable(),
  nextOrder: z.string().nullable(),
});

const reorderTasksSchema = z.object({
  updates: z.array(
    z.object({
      taskId: z.string().uuid(),
      order: z.string(),
    })
  ),
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

export const taskRoutes: FastifyPluginAsync = async (app) => {
  const { taskService } = app.container;

  app.post("/tasks", async (request, reply) => {
    try {
      const body = createTaskSchema.parse(request.body);
      const task = await taskService.create(body);

      return reply.status(201).send(task.toJSON());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/tasks/:id", async (request, reply) => {
    try {
      const params = getTaskParamsSchema.parse(request.params);
      const task = await taskService.getById(params.id);

      return reply.send(task.toJSON());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const tasksQueryParams = defineFilters((q) => ({
    title: q.string(),
    description: q.string(),
    status: q.string(),
    priority: q.string(),
    assignee: q.string(),
    labels: q.array.string(),
    order: q.string(),
  }));

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/tasks",
    schema: {
      querystring: CriteriaQuerySchema(tasksQueryParams, {
        orderBy: ["title", "status", "priority", "assignee", "order", "id"],
      }),
      response: {
        "2xx": PaginatedResponseSchema(TaskResponseSchema),
        "4xx": z.object({ error: z.any() }),
      },
    },
    handler: async (request, reply) => {
      try {
        const criteria = Criteria.fromQueryParams(request.query);
        const tasks = await taskService.list(criteria);

        return reply.send(tasks.toJSON());
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

  app.patch("/tasks/:id", async (request, reply) => {
    try {
      const params = getTaskParamsSchema.parse(request.params);
      const body = updateTaskSchema.parse(request.body);
      const task = await taskService.update(params.id, body);

      return reply.send(task.toJSON());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.delete("/tasks/:id", async (request, reply) => {
    try {
      const params = getTaskParamsSchema.parse(request.params);
      await taskService.delete(params.id);

      return reply.send({ message: "Task deleted successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/tasks/:id/move", async (request, reply) => {
    try {
      const params = getTaskParamsSchema.parse(request.params);
      const body = moveTaskSchema.parse(request.body);

      const task = await taskService.moveTask(
        params.id,
        body.newStatus,
        body.proposedOrder,
        body.prevOrder,
        body.nextOrder
      );

      return reply.send(task.toJSON());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/tasks/reorder", async (request, reply) => {
    try {
      const body = reorderTasksSchema.parse(request.body);
      await taskService.reorderTasks(body.updates);

      return reply.send({ message: "Tasks reordered successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: z.treeifyError(error) });
      }
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
};
