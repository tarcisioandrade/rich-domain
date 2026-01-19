import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import fastifyCors from "@fastify/cors";
import fastify from "fastify";
import { userRoutes } from "./infrastructure/http/routes/user.routes";
import { postRoutes } from "./infrastructure/http/routes/post.routes";
import { taskRoutes } from "./infrastructure/http/routes/task.routes";
import { prisma } from "./infrastructure/database/prisma";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
} from "fastify-type-provider-zod";
import { diPlugin } from "./infrastructure/di";

const app = fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

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

await app.register(diPlugin);
await app.register(userRoutes);
await app.register(postRoutes);
await app.register(taskRoutes);

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
    await prisma.$connect();

    console.log("Database connected successfully");

    const port = Number(process.env.PORT) || 3000;
    await app.ready();
    await app.listen({ port, host: "0.0.0.0" });

    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
