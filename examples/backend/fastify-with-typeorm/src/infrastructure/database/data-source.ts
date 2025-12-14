// database.ts
import { DataSource } from "typeorm";
import { TypeORMUnitOfWork } from "@woltz/rich-domain-typeorm";
import { UserEntity, PostEntity, TagEntity } from "./models";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "admin123",
  database: process.env.DB_NAME || "fastify_ddd",
  synchronize: process.env.NODE_ENV === "development",
  logging: process.env.NODE_ENV === "development",
  entities: [UserEntity, PostEntity, TagEntity],
  migrations: [],
  subscribers: [],
});

let uowInstance: TypeORMUnitOfWork | null = null;

export async function initializeDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    uowInstance = new TypeORMUnitOfWork(AppDataSource);
  }
}

export function getUoW(): TypeORMUnitOfWork {
  if (!uowInstance) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return uowInstance;
}

export function getDataSource(): DataSource {
  if (!AppDataSource.isInitialized) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return AppDataSource;
}
