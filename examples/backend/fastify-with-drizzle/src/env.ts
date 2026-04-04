import z from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.number(),
  REDIS_PORT: z.number(),
  REDIS_HOST: z.string(),
});

const rawConfig = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://admin:admin123@localhost:5433/fastify_drizzle",
  PORT: Number(process.env.PORT ?? 3001),
  REDIS_PORT: Number(process.env.REDIS_PORT ?? 6380),
  REDIS_HOST: process.env.REDIS_HOST ?? "localhost",
} as const;

export const env = configSchema.parse(rawConfig);
