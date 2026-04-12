import { TemplateFile, TemplateMetadata } from "../base.template.js";
import { FullstackBaseTemplate } from "../fullstack-base/index.js";

export class FullstackDrizzleTemplate extends FullstackBaseTemplate {
  readonly metadata: TemplateMetadata = {
    name: "fullstack-drizzle",
    description: "Fastify + Drizzle ORM + BullMQ + Zod — DDD starter",
    version: "1.0.0",
    tags: ["fastify", "drizzle", "bullmq", "zod", "ddd"],
  };

  // ─── ORM server hooks ─────────────────────────────────────────────────────

  protected getDbImportLines(): string {
    return `import { initializeDatabase, closeDatabase } from "./infra/database/db";\n`;
  }

  protected getDbInitCall(): string {
    return `await initializeDatabase();`;
  }

  protected getDbCloseCall(): string {
    return `await closeDatabase();`;
  }

  // ─── Dependencies ─────────────────────────────────────────────────────────

  getDependencies(): Record<string, string> {
    return {
      "@fastify/cors": "^11.0.0",
      "@fastify/swagger": "^9.6.0",
      "@fastify/swagger-ui": "^5.2.0",
      "@woltz/rich-domain": "^1.8.8",
      "@woltz/rich-domain-criteria-zod": "^0.1.5",
      "@woltz/rich-domain-drizzle": "^0.1.2",
      dotenv: "^17.4.0",
      bullmq: "^5.64.0",
      "drizzle-orm": "^0.44.0",
      fastify: "^5.5.0",
      "fastify-plugin": "^5.1.0",
      "fastify-type-provider-zod": "^6.1.0",
      ioredis: "^5.6.1",
      pg: "^8.16.0",
      "pino-pretty": "^13.0.0",
      zod: "^4.1.5",
    };
  }

  getDevDependencies(): Record<string, string> {
    return {
      "@types/node": "^22.10.0",
      "@types/pg": "^8.11.0",
      "drizzle-kit": "^0.30.0",
      tsx: "^4.19.0",
      typescript: "^5.7.0",
    };
  }

  protected getScripts(): Record<string, string> {
    return {
      dev: "tsx watch src/server.ts",
      build: "tsc",
      start: "node dist/server.js",
      lint: "tsc -b --noEmit",
      "db:generate": "drizzle-kit generate",
      "db:migrate": "drizzle-kit migrate",
      "db:push": "drizzle-kit push",
      "db:studio": "drizzle-kit studio",
      "db:seed": "tsx src/infra/database/seed/index.ts",
      "docker:up": "docker-compose up -d",
      "docker:down": "docker-compose down",
    };
  }

  // ─── ORM files ────────────────────────────────────────────────────────────

  protected generateOrmFiles(): TemplateFile[] {
    return [
      {
        path: "drizzle.config.ts",
        content: `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infra/database/drizzle/schema.ts",
  out: "./src/infra/database/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/app_db",
  },
});
`,
      },
      {
        path: "src/infra/database/drizzle/schema.ts",
        content: `import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("USER"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: text("published").notNull().default("false"),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

// ─── Inferred types ────────────────────────────────────────────────────────
export type UserRecord = typeof users.$inferSelect;
export type PostRecord = typeof posts.$inferSelect;
`,
      },
    ];
  }

  // ─── DB module ────────────────────────────────────────────────────────────

  protected generateDbModule(): TemplateFile[] {
    return [
      {
        path: "src/infra/database/db.ts",
        content: `import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../../env";
import * as schema from "./drizzle/schema";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function initializeDatabase() {
  pool = new Pool({ connectionString: env.DATABASE_URL });
  await pool.query("SELECT 1");
  db = drizzle(pool, { schema });
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db)
    throw new Error(
      "Database not initialized. Call initializeDatabase() first.",
    );
  return db;
}

export async function closeDatabase() {
  await pool?.end();
  db = null;
  pool = null;
}

export type DB = ReturnType<typeof getDb>;
`,
      },
    ];
  }

  // ─── Schemas ──────────────────────────────────────────────────────────────

  protected generateSchemas(): TemplateFile[] {
    return [
      {
        path: "src/infra/database/schemas/user.schema.ts",
        content: `export type { UserRecord } from "../drizzle/schema";
`,
      },
    ];
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  protected generateMappers(): TemplateFile[] {
    return [
      {
        path: "src/infra/database/mappers/user-to-domain.mapper.ts",
        content: `import { Id, Mapper } from "@woltz/rich-domain";
import { User } from "../../../domain/entities/user.aggregate";
import { Email } from "../../../domain/value-objects/email";
import type { UserRecord } from "../drizzle/schema";

export class UserToDomainMapper extends Mapper<UserRecord, User> {
  build(raw: UserRecord): User {
    return User.restore({
      id: Id.from(raw.id),
      email: new Email(raw.email),
      name: raw.name,
      role: raw.role as "USER" | "ADMIN",
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
`,
      },
      {
        path: "src/infra/database/mappers/user-to-persistence.mapper.ts",
        content: `import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { DrizzleToPersistence } from "@woltz/rich-domain-drizzle";
import type { User } from "../../../domain/entities/user.aggregate";
import type { DB } from "../db";
import { users } from "../drizzle/schema";

export class UserToPersistenceMapper extends DrizzleToPersistence<User, DB> {
  protected readonly registry = new EntitySchemaRegistry().register({
    entity: "User",
    table: "users",
  });

  protected readonly tableMap = new Map<string, any>([["User", users]]);

  protected async onCreate(user: User): Promise<void> {
    await this.context.insert(users).values({
      id: user.id.value,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
`,
      },
    ];
  }

  // ─── Repositories ─────────────────────────────────────────────────────────

  protected generateRepositories(): TemplateFile[] {
    return [
      {
        path: "src/infra/database/repositories/drizzle-user.repository.ts",
        content: `import {
  DrizzleRepository,
  type DrizzleUnitOfWork,
  type SearchableField,
} from "@woltz/rich-domain-drizzle";
import { eq } from "drizzle-orm";
import type { User } from "../../../domain/entities/user.aggregate";
import type { UserRepository } from "../../../domain/repositories/user.repository";
import type { DB } from "../db";
import { type UserRecord, users } from "../drizzle/schema";
import { UserToDomainMapper } from "../mappers/user-to-domain.mapper";
import { UserToPersistenceMapper } from "../mappers/user-to-persistence.mapper";

export class DrizzleUserRepository
  extends DrizzleRepository<User, UserRecord, DB>
  implements UserRepository {
  constructor(db: DB, uow: DrizzleUnitOfWork) {
    super({
      db,
      table: users,
      toDomainMapper: new UserToDomainMapper(),
      toPersistenceMapper: new UserToPersistenceMapper(db, uow),
      uow,
    });
  }

  protected get model() {
    return "users";
  }

  protected getSearchableFields(): SearchableField<UserRecord>[] {
    return ["name", "email"];
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.context.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!record) return null;
    const user = this.toDomainMapper.build(record);
    user.markAsClean();
    return user;
  }
}
`,
      },
    ];
  }

  // ─── DI Container ─────────────────────────────────────────────────────────

  protected generateDiContainer(): TemplateFile {
    return {
      path: "src/infra/di/container.ts",
      content: `import { DrizzleUnitOfWork } from "@woltz/rich-domain-drizzle";
import { IDomainEventBus } from "@woltz/rich-domain";
import { getDb } from "../database/db";
import { DrizzleUserRepository } from "../database/repositories/drizzle-user.repository";
import { BullMQEventBus } from "../queue/event-bus";
import { connection } from "../queue/connection";
import { UserService } from "../../application/service/user.service";

export class Container {
  private static instance: Container;
  private services = new Map<string, { factory: () => any; instance: any }>();

  private constructor() {
    this.register("unitOfWork", () => new DrizzleUnitOfWork(getDb()));
    this.register("eventBus", () => new BullMQEventBus(connection));
    this.register(
      "userRepository",
      () =>
        new DrizzleUserRepository(
          getDb(),
          this.resolve<DrizzleUnitOfWork>("unitOfWork")
        )
    );
    this.register(
      "userService",
      () =>
        new UserService(
          this.resolve<DrizzleUserRepository>("userRepository"),
          this.resolve<IDomainEventBus>("eventBus")
        )
    );
  }

  static getInstance(): Container {
    if (!Container.instance) Container.instance = new Container();
    return Container.instance;
  }

  private register<T>(name: string, factory: () => T): void {
    this.services.set(name, { factory, instance: null });
  }

  resolve<T>(name: string): T {
    const svc = this.services.get(name);
    if (!svc) throw new Error(\`Service "\${name}" not registered\`);
    if (!svc.instance) svc.instance = svc.factory();
    return svc.instance as T;
  }

  get userService(): UserService {
    return this.resolve<UserService>("userService");
  }
}

export const container = Container.getInstance();
`,
    };
  }
}
