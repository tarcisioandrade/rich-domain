import z from "zod";
import { config } from "dotenv";
config();

const configSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.number(),
  REDIS_PORT: z.number(),
  REDIS_HOST: z.string(),
});

const rawConfig = {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: Number(process.env.PORT),
  REDIS_PORT: Number(process.env.REDIS_PORT),
  REDIS_HOST: process.env.REDIS_HOST,
} as const;

export const env = configSchema.parse(rawConfig);
