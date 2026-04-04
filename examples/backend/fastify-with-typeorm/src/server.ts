import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import fastify from "fastify";
import {
  AppDataSource,
  initializeDatabase,
} from "./infrastructure/database/data-source";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  hasZodFastifySchemaValidationErrors,
} from "fastify-type-provider-zod";
import {
  ApplicationError,
  EntityNotFoundError,
  EntityAlreadyExistsError,
  UnauthorizedError,
  ForbiddenError,
} from "@woltz/rich-domain";
import { userRoutes } from "./infrastructure/http/routes/user.routes";
import { postRoutes } from "./infrastructure/http/routes/post.routes";
import { diPlugin } from "./infrastructure/di";
import { BullMQDomainEventWorker } from "./infrastructure/queue/event-worker";
import { connection } from "./infrastructure/queue/connection";
import { registerUserEventHandlers } from "./infrastructure/events/user";
import { env } from "./env";

const isDev = env.NODE_ENV === "development";

const app = fastify({
  logger: {
    level: isDev ? "debug" : "info",
    ...(isDev && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
          singleLine: false,
          messageFormat: "{msg}",
          errorLikeObjectKeys: ["err", "error"],
        },
      },
    }),
  },
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "SampleApi",
      description: "Sample backend service",
      version: "1.0.0",
    },
    servers: [],
  },
  transform: jsonSchemaTransform,
  transformObject: jsonSchemaTransformObject,
});

app.register(fastifySwaggerUI, { routePrefix: "/doc" });
app.register(diPlugin);
app.register(userRoutes);
app.register(postRoutes);

app.setErrorHandler((error, _request, reply) => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.status(400).send({
      error: "Validation Error",
      message: "The submitted data is invalid.",
      details: error.validation,
    });
  }

  if (error instanceof EntityNotFoundError) {
    return reply
      .status(404)
      .send({ error: "Not Found", message: error.message });
  }

  if (error instanceof UnauthorizedError) {
    return reply
      .status(401)
      .send({ error: "Unauthorized", message: error.message });
  }

  if (error instanceof ForbiddenError) {
    return reply
      .status(403)
      .send({ error: "Forbidden", message: error.message });
  }

  if (error instanceof EntityAlreadyExistsError) {
    return reply
      .status(409)
      .send({ error: "Conflict", message: error.message });
  }

  if (error instanceof ApplicationError) {
    return reply
      .status(400)
      .send({ error: "Bad Request", message: error.message });
  }

  app.log.error({ err: error }, "Unexpected error");
  return reply.status(500).send({
    error: "Internal Server Error",
    message: "An unexpected error occurred.",
  });
});

app.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

const start = async () => {
  try {
    await initializeDatabase();
    app.log.info("Database connected");

    await app.ready();

    const worker = new BullMQDomainEventWorker(connection, app);
    registerUserEventHandlers(worker);
    await worker.start();
    app.log.info("Domain event worker started");

    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`Server running at http://localhost:${env.PORT}`);
    app.log.info(`Swagger UI at http://localhost:${env.PORT}/doc`);

    const shutdown = async () => {
      await worker.stop();
      await AppDataSource.destroy();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    app.log.error(err);
    await AppDataSource.destroy();
    process.exit(1);
  }
};

start();
