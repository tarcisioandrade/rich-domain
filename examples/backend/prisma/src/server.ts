import fastify from "fastify";
import cors from "@fastify/cors";
import { userRoutes } from "./infrastructure/http/routes/user.routes";
import { postRoutes } from "./infrastructure/http/routes/post.routes";
import { prisma } from "./infrastructure/database/prisma";
import { enqueueDomainEvent } from "./infrastructure/queue/event-queue";
import { EVENT_BUS } from "./infrastructure/queue/event-bus";

const app = fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

await app.register(userRoutes);
await app.register(postRoutes);

app.addHook("onError", async (request, reply, error) => {
  request.log.error(error);
  reply.status(500).send({ error: "Internal Server Error" });
});

app.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await prisma.$connect();

    console.log("Database connected successfully");

    EVENT_BUS.subscribeAll(async (event) => {
      await enqueueDomainEvent(event);
    });

    const port = Number(process.env.PORT) || 3000;
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
