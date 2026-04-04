import fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
} from "fastify-type-provider-zod";
import {
  initializeDatabase,
  closeDatabase,
} from "./infrastructure/database/db";
import diPlugin from "./infrastructure/di/fastify-plugin";
import { userRoutes } from "./infrastructure/http/routes/user.routes";
import { postRoutes } from "./infrastructure/http/routes/post.routes";
import { env } from "./env";

const app = fastify({ logger: true });

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Fastify with Drizzle — DDD Example",
      description: "Rich Domain + Drizzle ORM adapter example",
      version: "1.0.0",
    },
    servers: [],
  },
  transform: jsonSchemaTransform,
  transformObject: jsonSchemaTransformObject,
});

app.register(fastifySwaggerUI, { routePrefix: "/doc" });
app.register(diPlugin);

app.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

app.register(userRoutes);
app.register(postRoutes);

const start = async () => {
  try {
    await initializeDatabase();
    app.log.info("Database connected");

    await app.ready();
    await app.listen({ port: env.PORT, host: "0.0.0.0" });

    app.log.info(`Server running at http://localhost:${env.PORT}`);
    app.log.info(`Swagger UI at http://localhost:${env.PORT}/doc`);
  } catch (err) {
    app.log.error(err);
    await closeDatabase();
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await closeDatabase();
  process.exit(0);
});

start();
