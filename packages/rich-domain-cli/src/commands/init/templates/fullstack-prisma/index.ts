import { TemplateFile, TemplateMetadata } from "../base.template.js";
import { FullstackBaseTemplate } from "../fullstack-base/index.js";

export class FullstackPrismaTemplate extends FullstackBaseTemplate {
  readonly metadata: TemplateMetadata = {
    name: "fullstack-prisma",
    description: "Fastify + Prisma + BullMQ + Zod — DDD starter",
    version: "1.0.0",
    tags: ["fastify", "prisma", "bullmq", "zod", "ddd"],
  };

  // ─── ORM server hooks ────────────────────────────────────────────────────

  protected getDbImportLines(): string {
    return `import { prisma } from "./infra/database/prisma";\n`;
  }

  protected getDbInitCall(): string {
    return `await prisma.$connect();`;
  }

  protected getDbCloseCall(): string {
    return `await prisma.$disconnect();`;
  }

  protected getRootTsConfigFiles(): string[] {
    return ["prisma.config.ts"];
  }

  // ─── Dependencies ─────────────────────────────────────────────────────────

  getDependencies(): Record<string, string> {
    return {
      "@fastify/cors": "^11.0.0",
      "@fastify/swagger": "^9.6.0",
      "@fastify/swagger-ui": "^5.2.6",
      "@prisma/adapter-pg": "^7.8.0",
      "@prisma/client": "^7.8.0",
      "@woltz/rich-domain": "^1.9.2",
      "@woltz/rich-domain-criteria-zod": "^0.1.5",
      "@woltz/rich-domain-prisma": "^0.7.9",
      dotenv: "^17.4.2",
      bullmq: "^5.78.0",
      fastify: "^5.8.5",
      "fastify-plugin": "^5.1.0",
      "fastify-type-provider-zod": "^6.1.0",
      ioredis: "^5.11.1",
      pg: "^8.21.0",
      "pino-pretty": "^13.0.0",
      zod: "^4.4.3",
    };
  }

  getDevDependencies(): Record<string, string> {
    return {
      ...this.getBaseDevDependencies(),
      "@types/pg": "^8.11.0",
      prisma: "^7.8.0",
    };
  }

  protected getScripts(): Record<string, string> {
    return {
      ...this.getBaseScripts(),
      "db:generate": "prisma generate",
      "db:migrate": "prisma migrate dev",
      "db:push": "prisma db push",
      "db:studio": "prisma studio",
      "db:seed": "tsx src/infra/database/seed/index.ts",
      "docker:up": "docker-compose up -d",
      "docker:down": "docker-compose down",
      postinstall: "prisma generate",
    };
  }

  // ─── ORM files ────────────────────────────────────────────────────────────

  protected generateOrmFiles(): TemplateFile[] {
    return [
      {
        path: "prisma.config.ts",
        content: `import path from "node:path";
import { defineConfig } from "prisma/config";
import { env } from "./src/env";

export default defineConfig({
  schema: path.join("src", "infra", "database", "prisma", "schema.prisma"),
  datasource: {
    url: env.DATABASE_URL,
  },
  migrations: {
    path: path.join("src", "infra", "database", "prisma", "migrations"),
    seed: path.join("src", "infra", "database", "seed", "seed.ts"),
  },
});
`,
      },
      {
        path: "src/infra/database/prisma/schema.prisma",
        content: `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      String   @default("USER")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`,
      },
    ];
  }

  // ─── DB module ────────────────────────────────────────────────────────────

  protected generateDbModule(): TemplateFile[] {
    return [
      {
        path: "src/infra/database/prisma.ts",
        content: `import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../../env";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
`,
      },
    ];
  }

  // ─── Schemas ──────────────────────────────────────────────────────────────

  protected generateSchemas(): TemplateFile[] {
    return [
      {
        path: "src/infra/database/schemas/user.schema.ts",
        content: `import type { Prisma } from "@prisma/client";

export type UserSchema = Prisma.UserGetPayload<Record<string, never>>;
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
import type { UserSchema } from "../schemas/user.schema";

export class UserToDomainMapper extends Mapper<UserSchema, User> {
  build(raw: UserSchema): User {
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
        content: `import type { PrismaClient } from "@prisma/client";
import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { PrismaToPersistence } from "@woltz/rich-domain-prisma";
import type { User } from "../../../domain/entities/user.aggregate";

export class UserToPersistenceMapper extends PrismaToPersistence<
  User,
  PrismaClient
> {
  protected readonly registry = new EntitySchemaRegistry().register({
    entity: "User",
    table: "user",
  });

  protected async onCreate(user: User): Promise<void> {
    await this.context.user.create({
      data: {
        id: user.id.value,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
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
        path: "src/infra/database/repositories/prisma-user.repository.ts",
        content: `import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PrismaRepository,
  type PrismaUnitOfWork,
} from "@woltz/rich-domain-prisma";
import type { User } from "../../../domain/entities/user.aggregate";
import type { UserRepository } from "../../../domain/repositories/user.repository";
import { UserToDomainMapper } from "../mappers/user-to-domain.mapper";
import { UserToPersistenceMapper } from "../mappers/user-to-persistence.mapper";
import type { UserSchema } from "../schemas/user.schema";

export class PrismaUserRepository
  extends PrismaRepository<User, UserSchema, PrismaClient>
  implements UserRepository
{
  protected readonly model = "user" as const;
  protected readonly includes = {};

  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {
    super(
      new UserToPersistenceMapper(prisma, uow),
      new UserToDomainMapper(),
      prisma,
      uow,
    );
  }

  protected generateSearchQuery(search: string): Prisma.UserWhereInput[] {
    return [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  async findByEmail(email: string): Promise<User | null> {
    const raw = await this.context.user.findUnique({ where: { email } });
    return raw ? this.toDomainMapper.build(raw) : null;
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
      content: `import type { PrismaClient } from "@prisma/client";
import type { IDomainEventBus } from "@woltz/rich-domain";
import { PrismaUnitOfWork } from "@woltz/rich-domain-prisma";
import { UserService } from "../../application/service/user.service";
import { prisma } from "../database/prisma";
import { PrismaUserRepository } from "../database/repositories/prisma-user.repository";
import { connection } from "../queue/connection";
import { BullMQEventBus } from "../queue/event-bus";

export class Container {
  private static instance: Container;
  private services = new Map<
    string,
    { factory: () => unknown; instance: unknown }
  >();

  private constructor() {
    this.register("prisma", () => prisma);
    this.register(
      "unitOfWork",
      () => new PrismaUnitOfWork(this.resolve<PrismaClient>("prisma")),
    );
    this.register("eventBus", () => new BullMQEventBus(connection));
    this.register(
      "userRepository",
      () =>
        new PrismaUserRepository(
          this.resolve<PrismaClient>("prisma"),
          this.resolve<PrismaUnitOfWork>("unitOfWork"),
        ),
    );
    this.register(
      "userService",
      () =>
        new UserService(
          this.resolve<PrismaUserRepository>("userRepository"),
          this.resolve<IDomainEventBus>("eventBus"),
        ),
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
