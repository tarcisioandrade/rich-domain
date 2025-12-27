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
} from "fastify-type-provider-zod";
import { userRoutes } from "./infrastructure/http/routes/user.routes";
import { postRoutes } from "./infrastructure/http/routes/post.routes";
import dotenv from "dotenv";

dotenv.config();

const app = fastify({
  logger: true,
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

app.register(fastifySwaggerUI, {
  routePrefix: "/doc",
});

app.addHook("onError", async (request, reply, error) => {
  console.log("error", JSON.stringify(error, null, 2));
  reply.status(500).send({ error: "Internal Server Error" });
});

app.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

app.get("/openapi.json", async (request, reply) => {
  return app.swagger();
});

const start = async () => {
  try {
    await initializeDatabase();
    console.log("Database connected successfully");

    await app.register(userRoutes);
    await app.register(postRoutes);

    const port = Number(process.env.PORT) || 3000;

    await app.ready();
    await app.listen({ port, host: "0.0.0.0" });

    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    await AppDataSource.destroy();
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await AppDataSource.destroy();
  process.exit(0);
});

start();
