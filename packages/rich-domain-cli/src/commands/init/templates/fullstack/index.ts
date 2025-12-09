import {
  BaseTemplate,
  TemplateMetadata,
  TemplateOptions,
  TemplateFile,
} from "../base.template.js";

/**
 * Fullstack template with:
 * - Fastify API
 * - Prisma ORM
 * - BullMQ for background jobs
 * - Zod validation
 * - Docker setup
 * - Domain-Driven Design structure
 */
export class FullstackTemplate extends BaseTemplate {
  readonly metadata: TemplateMetadata = {
    name: "fullstack",
    description:
      "Complete API setup with Fastify, Prisma, BullMQ, Zod, and Docker",
    version: "1.0.0",
    tags: ["fastify", "prisma", "bullmq", "docker", "api"],
  };

  async generate(options: TemplateOptions): Promise<TemplateFile[]> {
    const files: TemplateFile[] = [];

    // Root config files
    files.push(this.generatePackageJson(options));
    files.push(this.generateTsConfig());
    files.push(this.generateEnvExample());
    files.push(this.generateDockerfile());
    files.push(this.generateDockerCompose(options));
    files.push(this.generateGitignore());
    files.push(this.generateReadme(options));

    // Prisma
    files.push(this.generatePrismaSchema());

    // Source files
    files.push(...this.generateSrcFiles());

    // Domain layer
    files.push(...this.generateDomainLayer());

    // Infrastructure layer
    files.push(...this.generateInfraLayer());

    // Application layer (controllers, use-cases)
    files.push(...this.generateApplicationLayer());

    return files;
  }

  getDependencies(): Record<string, string> {
    return {
      "@fastify/cors": "^10.0.1",
      "@fastify/helmet": "^13.0.0",
      "@fastify/sensible": "^6.0.1",
      "@prisma/client": "^6.1.0",
      "@woltz/rich-domain": "^1.4.0",
      "@woltz/rich-domain-criteria-zod": "^0.1.1",
      "@woltz/rich-domain-prisma": "^0.6.0",
      bullmq: "^5.64.0",
      dotenv: "^16.4.7",
      fastify: "^5.1.0",
      "fastify-type-provider-zod": "^6.1.0",
      pino: "^9.5.0",
      "pino-pretty": "^13.0.0",
      zod: "^4.1.5",
    };
  }

  getDevDependencies(): Record<string, string> {
    return {
      "@types/node": "^22.10.1",
      typescript: "^5.7.2",
      tsx: "^4.19.2",
      prisma: "^6.1.0",
      vitest: "^2.1.8",
      "@vitest/coverage-v8": "^2.1.8",
    };
  }

  protected getScripts(): Record<string, string> {
    return {
      dev: "tsx watch src/main.ts",
      build: "tsc",
      start: "node dist/main.js",
      test: "vitest",
      "test:coverage": "vitest --coverage",
      "db:generate": "prisma generate",
      "db:migrate": "prisma migrate dev",
      "db:push": "prisma db push",
      "db:studio": "prisma studio",
      "db:seed": "tsx prisma/seed.ts",
      "domain:generate": "rich-domain generate",
      lint: "tsc --noEmit",
      "docker:up": "docker-compose up -d",
      "docker:down": "docker-compose down",
      "worker:start": "tsx watch src/worker.ts",
    };
  }

  getPostInstallInstructions(options: TemplateOptions): string[] {
    const pm = options.packageManager;
    const run = pm === "npm" ? "npm run" : pm;

    return [
      `cd ${options.projectName}`,
      `${pm} install`,
      "cp .env.example .env",
      `${run} docker:up`,
      `${run} db:push`,
      `${run} dev`,
      "",
      "Your API will be running at http://localhost:3000",
      "Prisma Studio: " + `${run} db:studio`,
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Config files generators
  // ─────────────────────────────────────────────────────────────────────────────

  private generateTsConfig(): TemplateFile {
    const config = {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        lib: ["ES2022"],
        moduleResolution: "bundler",
        rootDir: "./src",
        outDir: "./dist",
        baseUrl: ".",
        paths: {
          "@/*": ["src/*"],
        },
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        esModuleInterop: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        forceConsistentCasingInFileNames: true,
        strict: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        noUncheckedIndexedAccess: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };

    return {
      path: "tsconfig.json",
      content: JSON.stringify(config, null, 2),
    };
  }

  private generateEnvExample(): TemplateFile {
    return {
      path: ".env.example",
      content: `# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=debug
`,
    };
  }

  private generateDockerfile(): TemplateFile {
    return {
      path: "Dockerfile",
      content: `FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Build
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

# Production
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
`,
    };
  }

  private generateDockerCompose(options: TemplateOptions): TemplateFile {
    return {
      path: "docker-compose.yml",
      content: `version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: ${options.projectName}-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ${options.projectName}-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
`,
    };
  }

  private generateGitignore(): TemplateFile {
    return {
      path: ".gitignore",
      content: `# Dependencies
node_modules/

# Build
dist/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Test
coverage/

# Prisma
prisma/*.db
prisma/*.db-journal
`,
    };
  }

  private generateReadme(options: TemplateOptions): TemplateFile {
    return {
      path: "README.md",
      content: `# ${options.projectName}

A Domain-Driven Design API built with Fastify, Prisma, and rich-domain.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start Docker services (PostgreSQL + Redis)
npm run docker:up

# Push database schema
npm run db:push

# Start development server
npm run dev
\`\`\`

## Project Structure

\`\`\`
src/
├── main.ts                 # Application entry point
├── config/                 # Configuration
├── domain/                 # Domain layer (DDD)
│   ├── entities/           # Aggregates and Entities
│   └── repository/         # Repository interfaces
├── infra/                  # Infrastructure layer
│   ├── database/           # Database connection
│   ├── mappers/            # Prisma mappers
│   ├── repository/         # Repository implementations
│   ├── schemas/            # Prisma type definitions
│   └── jobs/               # BullMQ workers
├── application/            # Application layer
│   ├── controllers/        # HTTP controllers
│   └── use-cases/          # Business use cases
└── shared/                 # Shared utilities
\`\`\`

## Available Scripts

| Script | Description |
|--------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production |
| \`npm run start\` | Start production server |
| \`npm run test\` | Run tests |
| \`npm run db:generate\` | Generate Prisma client |
| \`npm run db:migrate\` | Run migrations |
| \`npm run db:studio\` | Open Prisma Studio |
| \`npm run domain:generate\` | Generate domain from Prisma |
| \`npm run docker:up\` | Start Docker services |
| \`npm run worker:start\` | Start background worker |

## API Endpoints

### Users
- \`GET /users\` - List users
- \`GET /users/:id\` - Get user by ID
- \`POST /users\` - Create user
- \`PUT /users/:id\` - Update user
- \`DELETE /users/:id\` - Delete user

### Posts
- \`GET /posts\` - List posts
- \`GET /posts/:id\` - Get post by ID
- \`POST /posts\` - Create post
- \`PUT /posts/:id\` - Update post
- \`DELETE /posts/:id\` - Delete post
`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Prisma
  // ─────────────────────────────────────────────────────────────────────────────

  private generatePrismaSchema(): TemplateFile {
    return {
      path: "prisma/schema.prisma",
      content: `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Source files
  // ─────────────────────────────────────────────────────────────────────────────

  private generateSrcFiles(): TemplateFile[] {
    return [
      this.generateMain(),
      this.generateConfig(),
      this.generateServer(),
      this.generateWorker(),
    ];
  }

  private generateMain(): TemplateFile {
    return {
      path: "src/main.ts",
      content: `import "dotenv/config";
import { buildServer } from "./server.js";
import { config } from "./config/index.js";
import { prisma } from "./infra/database/prisma.js";
import { EVENT_BUS } from "./infra/queue/event-bus.js";
import { enqueueDomainEvent } from "./infra/queue/event-queue.js";

async function main() {
  const server = await buildServer();

  try {
    await prisma.$connect();
    console.log("📦 Database connected");

    EVENT_BUS.subscribeAll(async (event) => {
      await enqueueDomainEvent(event);
    });

    await server.ready();
    await server.listen({ port: config.port, host: "0.0.0.0" });

    console.log("🚀 Server running");
  } catch (error) {
    server.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("👋 Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

main();
`,
    };
  }

  private generateConfig(): TemplateFile {
    return {
      path: "src/config/index.ts",
      content: `export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",
  
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
  
  log: {
    level: process.env.LOG_LEVEL || "info",
  },
} as const;
`,
    };
  }

  private generateServer(): TemplateFile {
    return {
      path: "src/server.ts",
      content: `import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import { config } from "./config/index.js";
import { userRoutes } from "./infra/http/controllers/user.controller.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: config.log.level,
      transport: config.isDev
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    },
  });

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // Plugins
  await server.register(cors, { origin: true });
  await server.register(helmet);
  await server.register(sensible);

  // Health check
  server.get("/health", async () => ({ status: "ok" }));

  // Routes
  await server.register(userRoutes, { prefix: "/users" });

  return server;
}
`,
    };
  }

  private generateWorker(): TemplateFile {
    return {
      path: "src/worker.ts",
      content: `import "./infra/queue/event-worker";`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Domain layer
  // ─────────────────────────────────────────────────────────────────────────────

  private generateDomainLayer(): TemplateFile[] {
    return [
      // Entities
      {
        path: "src/domain/entities/user.aggregate.ts",
        content: `import { Aggregate, Id, EntityValidation } from "@woltz/rich-domain";
import { z } from "zod";
import { Role } from "./enums.js";
import { Post } from "./post.aggregate.js";

/**
 * User Validation Schema (scalar fields only)
 */
export const userSchema = z.object({
  id: z.instanceof(Id),
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  posts: z.array(z.instanceof(Post)),
  role: z.nativeEnum(Role),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * User Props Type
 */
export type UserProps = z.infer<typeof userSchema>;

/**
 * User Aggregate
 */
export class User extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
  };

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get password(): string {
    return this.props.password;
  }

  get role(): Role {
    return this.props.role;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Domain methods
  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  promoteToAdmin(): void {
    this.props.role = Role.ADMIN;
    this.props.updatedAt = new Date();
  }

  addPost(post: Post): void {
    this.props.posts.push(post);
  }

  removePost(postId: Id): void {
    this.props.posts = this.props.posts.filter(
      (post) => !post.id.equals(postId)
    );
  }
}
`,
      },
      {
        path: "src/domain/entities/post.aggregate.ts",
        content: `import { Aggregate, Id, EntityValidation } from "@woltz/rich-domain";
import { z } from "zod";

/**
 * Post Validation Schema (scalar fields only)
 */
export const postSchema = z.object({
  id: z.instanceof(Id),
  title: z.string().min(1),
  content: z.string(),
  published: z.boolean(),
  authorId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Post Props Type
 */
export type PostProps = z.infer<typeof postSchema>

/**
 * Post Aggregate
 */
export class Post extends Aggregate<PostProps> {
  protected static validation: EntityValidation<PostProps> = {
    schema: postSchema,
  };

  get title(): string {
    return this.props.title;
  }

  get content(): string {
    return this.props.content;
  }

  get published(): boolean {
    return this.props.published;
  }

  get authorId(): string {
    return this.props.authorId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Domain methods
  publish(): void {
    this.props.published = true;
    this.props.updatedAt = new Date();
  }

  unpublish(): void {
    this.props.published = false;
    this.props.updatedAt = new Date();
  }

  updateContent(title: string, content: string): void {
    this.props.title = title;
    this.props.content = content;
    this.props.updatedAt = new Date();
  }
}
`,
      },
      {
        path: "src/domain/entities/enums.ts",
        content: `/**
 * Auto-generated enums from Prisma schema
 */

export enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
}
`,
      },
      {
        path: "src/domain/entities/index.ts",
        content: `export * from "./user.aggregate.js";
export * from "./post.aggregate.js";
export * from "./enums.js";
`,
      },
      // Repository interfaces
      {
        path: "src/domain/repository/user.repository.ts",
        content: `import { Repository } from "@woltz/rich-domain";
import { User } from "../entities/user.aggregate.js";

export interface IUserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
}
`,
      },
      {
        path: "src/domain/repository/post.repository.ts",
        content: `import { Repository } from "@woltz/rich-domain";
import { Post } from "../entities/post.aggregate.js";

export interface IPostRepository extends Repository<Post> {
  findByAuthorId(authorId: string): Promise<Post[]>;
  findPublished(): Promise<Post[]>;
}
`,
      },
      {
        path: "src/domain/repository/index.ts",
        content: `export * from "./user.repository.js";
export * from "./post.repository.js";
`,
      },
      // Events
      {
        path: "src/domain/events/user/user-created.event.ts",
        content: `import { DomainEvent } from "@woltz/rich-domain";

export class UserCreatedEvent extends DomainEvent {}
`,
      },
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Infrastructure layer
  // ─────────────────────────────────────────────────────────────────────────────

  private generateInfraLayer(): TemplateFile[] {
    return [
      // Database
      {
        path: "src/infra/database/prisma.ts",
        content: `import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
`,
      },
      {
        path: "src/infra/database/unit-of-work.ts",
        content: `import { PrismaUnitOfWork } from "@woltz/rich-domain-prisma";
import { prisma } from "./prisma.js";

export function createUnitOfWork(): PrismaUnitOfWork {
  return new PrismaUnitOfWork(prisma);
}
`,
      },
      // Schemas
      {
        path: "src/infra/schemas/user.schema.ts",
        content: `import { Prisma } from "@prisma/client";

export type PrismaUserWithRelations = Prisma.UserGetPayload<{
  include: { posts: true };
}>;
`,
      },
      {
        path: "src/infra/schemas/post.schema.ts",
        content: `import { Post } from "@prisma/client";

export type PrismaPostWithRelations = Post;
`,
      },
      {
        path: "src/infra/schemas/index.ts",
        content: `export * from "./user.schema.js";
export * from "./post.schema.js";
`,
      },
      // Mappers
      {
        path: "src/infra/mappers/user-to-domain.mapper.ts",
        content: `import { Mapper, Id } from "@woltz/rich-domain";
import { PrismaUserWithRelations } from "../schemas/user.schema.js";
import { User } from "../../domain/entities/user.aggregate.js";
import { Post } from "@/domain/entities/post.aggregate.js";
import { Role } from "@/domain/entities/enums.js";

export class UserToDomainMapper extends Mapper<PrismaUserWithRelations, User> {
  build(raw: PrismaUserWithRelations): User {
    return new User({
      id: Id.from(raw.id),
      email: raw.email,
      name: raw.name,
      password: raw.password,
      posts: raw.posts.map(
        (post) =>
          new Post({
            id: Id.from(post.id),
            title: post.title,
            content: post.content,
            published: post.published,
            authorId: post.authorId,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
          })
      ),
      role: raw.role as Role,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}

`,
      },
      {
        path: "src/infra/mappers/user-to-persistence.mapper.ts",
        content: `import {
  PrismaBatchExecutor,
  PrismaToPersistence,
} from "@woltz/rich-domain-prisma";
import { User } from "../../domain/entities/user.aggregate.js";
import { AggregateChanges, EntitySchemaRegistry } from "@woltz/rich-domain";

export class UserToPersistenceMapper extends PrismaToPersistence<User> {
  protected readonly registry = new EntitySchemaRegistry().register({
    entity: "User",
    table: "user",
  }).register({
    entity: "Post",
    table: "post",
    parentFk: {
      field: "authorId",
      parentEntity: "User",
    },
  });

  protected async onCreate(entity: User) {
    await this.context.user.create({
      data: {
        id: entity.id.value,
        email: entity.email,
        name: entity.name,
        password: entity.password,
        role: entity.role,
      },
    });
  }

  protected async onUpdate(
    entity: User,
    changes: AggregateChanges
  ): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
      rootId: entity.id.value,
    });

    await executor.execute(changes);
  }
}
`,
      },
      {
        path: "src/infra/mappers/post-to-domain.mapper.ts",
        content: `import { Mapper, Id } from "@woltz/rich-domain";
import { PrismaPostWithRelations } from "../schemas/post.schema.js";
import { Post } from "../../domain/entities/post.aggregate.js";

export class PostToDomainMapper extends Mapper<PrismaPostWithRelations, Post> {
  build(raw: PrismaPostWithRelations): Post {
    return new Post({
      id: Id.from(raw.id),
      title: raw.title,
      content: raw.content,
      published: raw.published,
      authorId: raw.authorId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
`,
      },
      {
        path: "src/infra/mappers/post-to-persistence.mapper.ts",
        content: `import {
  PrismaBatchExecutor,
  PrismaToPersistence,
} from "@woltz/rich-domain-prisma";
import { Post } from "../../domain/entities/post.aggregate.js";
import { AggregateChanges, EntitySchemaRegistry } from "@woltz/rich-domain";

export class PostToPersistenceMapper extends PrismaToPersistence<Post> {
  protected readonly registry = new EntitySchemaRegistry().register({
    entity: "Post",
    table: "post",
  });

  protected async onCreate(entity: Post) {
    await this.context.post.create({
      data: {
        id: entity.id.value,
        title: entity.title,
        content: entity.content,
        published: entity.published,
        authorId: entity.authorId,
      },
    });
  }

  protected async onUpdate(
    entity: Post,
    changes: AggregateChanges
  ): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
      rootId: entity.id.value,
    });

    await executor.execute(changes);
  }
}
`,
      },
      {
        path: "src/infra/mappers/index.ts",
        content: `export * from "./user-to-domain.mapper.js";
export * from "./user-to-persistence.mapper.js";
export * from "./post-to-domain.mapper.js";
export * from "./post-to-persistence.mapper.js";
`,
      },
      // Repositories
      {
        path: "src/infra/repository/user.repository.ts",
        content: `import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { User } from "../../domain/entities/user.aggregate.js";
import type { IUserRepository } from "../../domain/repository/user.repository.js";
import { PrismaUserWithRelations } from "../schemas/user.schema.js";
import { UserToDomainMapper } from "../mappers/user-to-domain.mapper.js";
import { UserToPersistenceMapper } from "../mappers/user-to-persistence.mapper.js";

export class UserRepository
  extends PrismaRepository<User, PrismaUserWithRelations, PrismaClient>
  implements IUserRepository
{
  protected model = "user" as const;
  protected includes = { posts: true } satisfies Prisma.UserInclude;

  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {
    super(
      new UserToPersistenceMapper(prisma, uow),
      new UserToDomainMapper(),
      prisma,
      uow
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const raw = await this.context.user.findUnique({
      where: { email },
      include: this.includes,
    });

    return raw ? this.toDomainMapper.build(raw) : null;
  }

  generateSearchQuery(search: string): Prisma.UserWhereInput[] {
    return [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ] satisfies Prisma.UserWhereInput[];
  }
}
`,
      },
      {
        path: "src/infra/repository/post.repository.ts",
        content: `import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { Post } from "../../domain/entities/post.aggregate.js";
import type { IPostRepository } from "../../domain/repository/post.repository.js";
import { PrismaPostWithRelations } from "../schemas/post.schema.js";
import { PostToDomainMapper } from "../mappers/post-to-domain.mapper.js";
import { PostToPersistenceMapper } from "../mappers/post-to-persistence.mapper.js";

export class PostRepository
  extends PrismaRepository<Post, PrismaPostWithRelations, PrismaClient>
  implements IPostRepository
{
  protected model = "post" as const;
  protected includes = { author: true } satisfies Prisma.PostInclude;

  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {
    super(
      new PostToPersistenceMapper(prisma, uow),
      new PostToDomainMapper(),
      prisma,
      uow
    );
  }

  async findByAuthorId(authorId: string): Promise<Post[]> {
    const raw = await this.context.post.findMany({
      where: { authorId },
      include: this.includes,
    });

    return raw.map((r) => this.toDomainMapper.build(r));
  }

  async findPublished(): Promise<Post[]> {
    const raw = await this.context.post.findMany({
      where: { published: true },
      include: this.includes,
    });

    return raw.map((r) => this.toDomainMapper.build(r));
  }

  generateSearchQuery(search: string): Prisma.PostWhereInput[] {
    return [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ] satisfies Prisma.PostWhereInput[];
  }
}
`,
      },
      {
        path: "src/infra/repository/index.ts",
        content: `export * from "./user.repository.js";
export * from "./post.repository.js";
`,
      },
      // Jobs
      {
        path: "src/infra/queue/event-bus.ts",
        content: `import { DomainEventBus } from "@woltz/rich-domain";
import { UserCreatedEvent } from "../../domain/events/user/user-create.event";

export const EVENT_BUS = DomainEventBus.getInstance();

EVENT_BUS.subscribe({
  event: UserCreatedEvent,
  handler: (event: UserCreatedEvent) => {
    console.log("User Created Event", event);
  },
});

EVENT_BUS.subscribeAll((event) => {
  console.log("Event received");
  event;
});
`,
      },
      {
        path: "src/infra/queue/event-queue.ts",
        content: `import { Queue } from "bullmq";
import { IDomainEvent } from "@woltz/rich-domain";
import IORedis from "ioredis";

export const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

export const DomainEventQueue = new Queue<IDomainEvent>("domain-events", {
  connection,
});

/**
 * Publish a domain event to BullMQ queue
 */
export async function enqueueDomainEvent(event: IDomainEvent) {
  await DomainEventQueue.add(event.eventName, event);
}
`,
      },
      {
        path: "src/infra/queue/event-worker.ts",
        content: `import { Worker } from "bullmq";
import { IDomainEvent } from "@woltz/rich-domain";
import { EVENT_BUS } from "./event-bus.js";
import { connection } from "./event-queue.js";

export const DomainEventWorker = new Worker<IDomainEvent>(
  "domain-events",
  async (job) => {
    await EVENT_BUS.publish(job.data);
    return true;
  },
  { connection }
);

DomainEventWorker.on("completed", (job) => {});

DomainEventWorker.on("failed", (job, err) => {});

DomainEventWorker.on("ready", () => {
  console.log("[Worker] Ready");
});
`,
      },
      // HTTP
      {
        path: "src/infra/http/controllers/user.controller.ts",
        content: `import { FastifyPluginAsync } from "fastify";
import {
  CriteriaQuerySchema,
  defineFilters,
  PaginatedResponseSchema,
} from "@woltz/rich-domain-criteria-zod";
import { listUserDto } from "../dto/user/list-user.dto";
import { Criteria } from "@woltz/rich-domain";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { UserService } from "@/application/services";
import { UserRepository } from "@/infra/repository";
import { prisma } from "@/infra/database/prisma";
import { createUnitOfWork } from "@/infra/database/unit-of-work";
import { createUserDto } from "../dto/user/create-user.dto";

const filters = defineFilters((f) => ({
  email: f.email(),
  name: f.string(),
}));

const querySchema = CriteriaQuerySchema(filters, {
  orderBy: ["email", "name"] as const,
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
});

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  const uow = createUnitOfWork();
  const repo = new UserRepository(prisma, uow);
  const userService = new UserService(repo);

  // List users
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      querystring: querySchema,
      response: {
        200: PaginatedResponseSchema(listUserDto),
      },
    },
    handler: async (request) => {
      const criteria = Criteria.fromQueryParams(request.query);
      const users = await userService.list(criteria);
      return users.toJSON();
    },
  });

  // Create user
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      body: createUserDto,
    },
    handler: async (request) => {
      return await userService.create(request.body);
    },
  });
};
`,
      },
      // DTO
      {
        path: "src/infra/http/dto/user/create-user.dto.ts",
        content: `import { Role } from "@/domain/entities";
import z from "zod";

export const createUserDto = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(Role),
});

export type CreateUserDto = z.infer<typeof createUserDto>;
`,
      },
      {
        path: "src/infra/http/dto/user/list-user.dto.ts",
        content: `import { Role } from "@/domain/entities";
import z from "zod";

export const listUserDto = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(Role),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  posts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      published: z.boolean(),
      createdAt: z.union([z.string(), z.date()]),
      updatedAt: z.union([z.string(), z.date()]),
    })
  ),
});

export type ListUserDto = z.infer<typeof listUserDto>;
`,
      },
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Application layer
  // ─────────────────────────────────────────────────────────────────────────────

  private generateApplicationLayer(): TemplateFile[] {
    return [
      {
        path: "src/application/services/user.service.ts",
        content: `import { User } from "@/domain/entities";
import { CreateUserDto } from "@/infra/http/dto/user/create-user.dto";
import { UserRepository } from "@/infra/repository/user.repository.js";
import { Criteria, EntityAlreadyExistsError } from "@woltz/rich-domain";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async list(criteria: Criteria) {
    return await this.userRepository.find(criteria);
  }

  async create(dto: CreateUserDto) {
    const exist = await this.userRepository.findByEmail(dto.email);
    if (exist) {
      throw new EntityAlreadyExistsError("User", dto.email);
    }
    const user = new User({
      email: dto.email,
      name: dto.name,
      password: dto.password,
      posts: [],
      role: dto.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return await this.userRepository.save(user);
  }
}
`,
      },
      {
        path: "src/application/services/post.service.ts",
        content: `import { PostRepository } from "@/infra/repository/post.repository.js";

export class PostService {
  constructor(private readonly postRepository: PostRepository) {}
  // Add your methods here
}
`,
      },
      {
        path: "src/application/services/index.ts",
        content: `export * from "./user.service.js";
export * from "./post.service.js";
`,
      },
    ];
  }
}
