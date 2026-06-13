import {
  BaseTemplate,
  TemplateFile,
  TemplateOptions,
} from "../base.template.js";

/**
 * Abstract base for all fullstack templates.
 * Contains every ORM-agnostic file. Subclasses override the abstract methods
 * to supply ORM-specific files (schema, mappers, repositories, DI container).
 */
export abstract class FullstackBaseTemplate extends BaseTemplate {
  // ─── Abstract: must be implemented by each ORM template ───────────────────

  /** ORM schema files (e.g., prisma/schema.prisma, drizzle/schema.ts, typeorm/entities) */
  protected abstract generateOrmFiles(): TemplateFile[];

  /** DB connection / initialisation module (prisma.ts, db.ts, data-source.ts …) */
  protected abstract generateDbModule(): TemplateFile[];

  /** Persistence type schemas (Prisma.UserGetPayload, drizzle $inferSelect, TypeORM entity) */
  protected abstract generateSchemas(): TemplateFile[];

  /** Domain → persistence and persistence → domain mappers */
  protected abstract generateMappers(): TemplateFile[];

  /** Concrete repository implementations */
  protected abstract generateRepositories(): TemplateFile[];

  /** DI container (container.ts) */
  protected abstract generateDiContainer(): TemplateFile;

  // Lines injected into server.ts — differ only per ORM
  protected abstract getDbImportLines(): string;
  protected abstract getDbInitCall(): string;
  protected abstract getDbCloseCall(): string;

  generateWorkspaceConfig(): TemplateFile {
    return {
      path: ".vscode/settings.json",
      content: `{
  "typescript.tsdk": "node_modules\\\\typescript\\\\lib",
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}`,
    };
  }

  protected getBaseScripts(): Record<string, string> {
    return {
      dev: "tsx watch src/server.ts",
      build: "tsc -p tsconfig.build.json",
      start: "node dist/server.js",
      check: "tsc --noEmit",
      lint: "biome check .",
      "lint:fix": "biome check --write .",
      format: "biome format --write .",
    };
  }

  protected getBaseDevDependencies(): Record<string, string> {
    return {
      "@biomejs/biome": "^2.5.0",
      "@types/node": "^22.10.0",
      tsx: "^4.19.0",
      typescript: "^5.7.0",
    };
  }

  // ─── Concrete generate() ──────────────────────────────────────────────────

  async generate(options: TemplateOptions): Promise<TemplateFile[]> {
    const files: TemplateFile[] = [];

    // Root
    files.push(this.generatePackageJson(options));
    files.push(this.generateWorkspaceConfig());
    files.push(this.generateBiomeConfig());
    files.push(this.generateTsConfig());
    files.push(this.generateTsConfigBuild());
    files.push(this.generateEnvExample());
    files.push(this.generateDockerCompose(options));
    files.push(this.generateGitignore());
    files.push(this.generateReadme(options));

    // ORM schema files (e.g. prisma/schema.prisma)
    files.push(...this.generateOrmFiles());

    // src root
    files.push(this.generateConstants());
    files.push(this.generateEnv());
    files.push(this.generateOpenapiUtil());
    files.push(this.generateServer());

    // Domain
    files.push(...this.generateDomainLayer());

    // Infra — database (DB module + schemas + mappers + repos + seed)
    files.push(...this.generateDbModule());
    files.push(...this.generateSchemas());
    files.push(...this.generateMappers());
    files.push(...this.generateRepositories());
    files.push(this.generateSeed());

    // Infra — queue
    files.push(...this.generateQueueLayer());

    // Infra — DI
    files.push(this.generateDiContainer());
    files.push(this.generateFastifyPlugin());

    // Application
    files.push(...this.generateApplicationLayer());

    // Presentation
    files.push(...this.generatePresentationLayer());

    return files;
  }

  // ─── Root config files ────────────────────────────────────────────────────

  /** Root-level TS config files (e.g. prisma.config.ts) included in type-checking. */
  protected getRootTsConfigFiles(): string[] {
    return [];
  }

  protected getTsConfigCompilerOptions(): Record<string, unknown> {
    return {
      target: "ES2020",
      module: "ESNext",
      lib: ["ES2022"],
      moduleResolution: "bundler",
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      noUncheckedIndexedAccess: true,
      noFallthroughCasesInSwitch: true,
      types: ["node"],
      noEmit: true,
    };
  }

  protected generateTsConfig(): TemplateFile {
    const config = {
      compilerOptions: this.getTsConfigCompilerOptions(),
      include: ["src/**/*", ...this.getRootTsConfigFiles()],
      exclude: ["node_modules", "dist"],
    };
    return { path: "tsconfig.json", content: JSON.stringify(config, null, 2) };
  }

  protected generateTsConfigBuild(): TemplateFile {
    const config = {
      extends: "./tsconfig.json",
      compilerOptions: {
        noEmit: false,
        rootDir: "./src",
        outDir: "./dist",
        declaration: true,
        sourceMap: true,
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };
    return {
      path: "tsconfig.build.json",
      content: JSON.stringify(config, null, 2),
    };
  }

  private generateBiomeConfig(): TemplateFile {
    return {
      path: "biome.json",
      content: `{
  "$schema": "https://biomejs.dev/schemas/2.5.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "includes": ["src/**/*.ts"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended"
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
`,
    };
  }

  private generateEnvExample(): TemplateFile {
    return {
      path: ".env",
      content: `# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development
`,
    };
  }

  private generateDockerCompose(options: TemplateOptions): TemplateFile {
    return {
      path: "docker-compose.yml",
      content: `services:
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
      content: `node_modules/
dist/
.env
.env.local
.env.*.local
.idea/
.vscode/
*.swp
*.swo
.DS_Store
Thumbs.db
logs/
*.log
coverage/
`,
    };
  }

  private generateReadme(options: TemplateOptions): TemplateFile {
    return {
      path: "README.md",
      content: `# ${options.projectName}

A Domain-Driven Design API built with Fastify and @woltz/rich-domain.

## Getting Started

\`\`\`bash
${options.packageManager} install
cp .env.example .env
${options.packageManager === "npm" ? "npm run" : options.packageManager} docker:up
${options.packageManager === "npm" ? "npm run" : options.packageManager} db:push
${options.packageManager === "npm" ? "npm run" : options.packageManager} dev
\`\`\`

## Scripts

| Script | Description |
|--------|-------------|
| \`dev\` | Start development server with pino-pretty |
| \`build\` | Compile TypeScript |
| \`start\` | Start production server |
| \`check\` | Type-check with TypeScript |
| \`lint\` | Lint and format check with Biome |
| \`lint:fix\` | Lint and apply safe fixes with Biome |
| \`format\` | Format code with Biome |
| \`docker:up\` | Start PostgreSQL + Redis via Docker |
| \`docker:down\` | Stop Docker services |

## Architecture

\`\`\`
src/
  application/
    service/          ← use-case orchestration
    processor/
      events.processor.ts   ← observe-only event handlers (logging, emails)
      action.processor.ts   ← mutation event handlers
  domain/
    entities/         ← aggregates with validation & hooks
    repositories/     ← repository interfaces
    events/           ← domain events
  infra/
    database/         ← ORM integration (mappers, repositories, schemas)
    di/               ← dependency injection container
    queue/            ← BullMQ event bus & worker
  presentation/
    controllers/      ← Fastify route handlers (FastifyPluginAsyncZod)
    dto/              ← Zod request/response schemas
\`\`\`
`,
    };
  }

  // ─── src root files ───────────────────────────────────────────────────────

  private generateConstants(): TemplateFile {
    return {
      path: "src/constants.ts",
      content: `export const QUEUES = {
  MAIN: "main-queue",
  WORKFLOW_EVENTS: "workflow-events",
  NOTIFICATION_EVENTS: "notification-events",
} as const;
`,
    };
  }

  private generateEnv(): TemplateFile {
    return {
      path: "src/env.ts",
      content: `import "dotenv/config";
import z from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.number(),
  REDIS_PORT: z.number(),
  REDIS_HOST: z.string(),
});

const rawConfig = {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT || 3000),
  REDIS_PORT: Number(process.env.REDIS_PORT || 6379),
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
} as const;

export const env = configSchema.parse(rawConfig);
`,
    };
  }

  private generateOpenapiUtil(): TemplateFile {
    return {
      path: "src/utils/generate-openpai.ts",
      content: `import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";

export function generateOpenapi(app: FastifyInstance) {
  const spec = app.swagger();
  const outputPath = resolve(import.meta.dirname, "../../openapi.json");

  writeFileSync(outputPath, JSON.stringify(spec, null, 2));

  app.log.info("OpenAPI spec generated 👌");
}
`,
    };
  }

  protected generateServer(): TemplateFile {
    return {
      path: "src/server.ts",
      content: `import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import {
  ApplicationError,
  EntityAlreadyExistsError,
  EntityNotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "@woltz/rich-domain";
import fastify from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { registerActionProcessors } from "./application/processor/action.processor";
import { registerEventProcessors } from "./application/processor/events.processor";
import { env } from "./env";
${this.getDbImportLines()}import { diPlugin } from "./infra/di/fastify-plugin";
import { connection } from "./infra/queue/connection";
import { BullMQDomainEventWorker } from "./infra/queue/event-worker";
import { userController } from "./presentation/controllers/user.controller";
import { generateOpenapi } from "./utils/generate-openpai";

const isDev = env.NODE_ENV === "development";

const app = fastify({
  logger: {
    level: isDev ? "debug" : "info",
    ...(isDev && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
          singleLine: false,
          messageFormat: "{msg}",
          errorLikeObjectKeys: ["err", "error"],
        },
      },
    }),
  },
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifyCors, { origin: true });

app.register(fastifySwagger, {
  openapi: {
    info: { title: "API", description: "Rich Domain API", version: "1.0.0" },
    servers: [],
  },
  transform: jsonSchemaTransform,
  transformObject: jsonSchemaTransformObject,
});

app.register(fastifySwaggerUI, { routePrefix: "/doc" });
app.register(diPlugin);
app.register(userController);

app.setErrorHandler((error, _request, reply) => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.status(400).send({
      error: "Validation Error",
      message: "The submitted data is invalid.",
      details: error.validation,
    });
  }
  if (error instanceof EntityNotFoundError) {
    return reply
      .status(404)
      .send({ error: "Not Found", message: error.message });
  }
  if (error instanceof UnauthorizedError) {
    return reply
      .status(401)
      .send({ error: "Unauthorized", message: error.message });
  }
  if (error instanceof ForbiddenError) {
    return reply
      .status(403)
      .send({ error: "Forbidden", message: error.message });
  }
  if (error instanceof EntityAlreadyExistsError) {
    return reply
      .status(409)
      .send({ error: "Conflict", message: error.message });
  }
  if (error instanceof ApplicationError) {
    return reply
      .status(400)
      .send({ error: "Bad Request", message: error.message });
  }
  app.log.error({ err: error }, "Unexpected error");
  return reply.status(500).send({
    error: "Internal Server Error",
    message: "An unexpected error occurred.",
  });
});

app.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

const start = async () => {
  try {
    ${this.getDbInitCall()}
    app.log.info("Database connected");

    await app.ready();
    generateOpenapi(app);

    const worker = new BullMQDomainEventWorker(connection, app);
    registerEventProcessors(worker);
    registerActionProcessors(worker);
    await worker.start();
    app.log.info("Domain event worker started");

    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(\`Server running at http://localhost:\${env.PORT}\`);
    app.log.info(\`Swagger UI at http://localhost:\${env.PORT}/doc\`);

    const shutdown = async () => {
      await worker.stop();
      ${this.getDbCloseCall()}
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    app.log.error(err);
    ${this.getDbCloseCall()}
    process.exit(1);
  }
};

start();
`,
    };
  }

  // ─── Domain layer ─────────────────────────────────────────────────────────

  private generateDomainLayer(): TemplateFile[] {
    return [
      {
        path: "src/domain/entities/user.aggregate.ts",
        content: `import {
  Aggregate,
  type EntityHooks,
  type EntityValidation,
  type Id,
} from "@woltz/rich-domain";
import { z } from "zod";
import { UserCreatedEvent } from "../events/user-created.event";
import type { Email } from "../value-objects/email";

export const Role = z.enum(["USER", "ADMIN"]);
export const UserSchema = z.object({
  id: z.custom<Id>(),
  email: z.custom<Email>(),
  name: z.string().min(1),
  role: Role,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserProps = z.infer<typeof UserSchema>;
export type Role = z.infer<typeof Role>;

export class User extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: UserSchema,
  };

  protected static hooks: EntityHooks<UserProps, User> = {
    onCreate: (entity) => {
      if (entity.isNew()) {
        entity.addDomainEvent(
          new UserCreatedEvent({ email: entity.props.email.value }),
        );
      }
    },
  };

  static create(
    props: Omit<UserProps, "id" | "createdAt" | "updatedAt">,
  ): User {
    return new User({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  updateName(name: string): void {
    if (name.trim().length === 0) throw new Error("Name cannot be empty");
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  promoteToAdmin(): void {
    this.props.role = "ADMIN";
    this.props.updatedAt = new Date();
  }

  get email(): string {
    return this.props.email.value;
  }
  get name(): string {
    return this.props.name;
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
}
`,
      },
      {
        path: "src/domain/repositories/user.repository.ts",
        content: `import type { Repository } from "@woltz/rich-domain";
import type { User } from "../entities/user.aggregate";

export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
}
`,
      },
      {
        path: "src/domain/events/user-created.event.ts",
        content: `import { DomainEvent } from "@woltz/rich-domain";

export type UserCreatedPayload = {
  email: string;
};

export class UserCreatedEvent extends DomainEvent<UserCreatedPayload> {}
`,
      },
      // Value-objects placeholder
      {
        path: "src/domain/value-objects/email.ts",
        content: `import {
  DomainError,
  ValueObject,
  type VOValidation,
} from "@woltz/rich-domain";
import { z } from "zod";

export const EmailSchema = z.email();
export type EmailProp = z.infer<typeof EmailSchema>;

export class Email extends ValueObject<EmailProp> {
  protected static validation: VOValidation<EmailProp> = {
    schema: EmailSchema,
  };

  public getProviderValue() {
    const provider = this.value.split("@")[1];
    if (!provider) throw new DomainError("Invalid email");
    return provider;
  }
}
`,
      },
    ];
  }

  // ─── Seed ─────────────────────────────────────────────────────────────────

  private generateSeed(): TemplateFile {
    return {
      path: "src/infra/database/seed/index.ts",
      content: `/**
 * Database seed script.
 * Add your seed logic here and run it with: npm run db:seed
 */
async function seed() {
  console.log("Seeding database...");
  // TODO: add seed data
  console.log("Done.");
}

seed().catch(console.error);
`,
    };
  }

  // ─── Queue layer ──────────────────────────────────────────────────────────

  private generateQueueLayer(): TemplateFile[] {
    return [
      {
        path: "src/infra/queue/connection.ts",
        content: `import IORedis from "ioredis";
import { env } from "../../env";

export const connection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});
`,
      },
      {
        path: "src/infra/queue/event-bus.ts",
        content: `import {
  DomainEventError,
  type IDomainEvent,
  type IDomainEventBus,
} from "@woltz/rich-domain";
import { type JobsOptions, Queue } from "bullmq";
import type IORedis from "ioredis";
import { QUEUES } from "../../constants";

export class BullMQEventBus implements IDomainEventBus {
  private queues: Map<string, Queue<IDomainEvent>> = new Map();
  private readonly defaultQueueName = QUEUES.MAIN;

  constructor(private readonly connection: IORedis) {}

  private getQueue(queueName: string): Queue<IDomainEvent> {
    if (!this.queues.has(queueName)) {
      this.queues.set(
        queueName,
        new Queue<IDomainEvent>(queueName, {
          connection: this.connection.options,
        }),
      );
    }

    const queue = this.queues.get(queueName);
    if (!queue) throw new DomainEventError(\`Queue "\${queueName}" not found\`);

    return queue;
  }

  private getQueueName(event: IDomainEvent): string {
    const ctor = event.constructor as { queueName?: string };
    return ctor.queueName ?? this.defaultQueueName;
  }

  async publish(event: IDomainEvent, options?: JobsOptions): Promise<void> {
    const queue = this.getQueue(this.getQueueName(event));
    await queue.add(event.eventName, event, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      ...options,
    });
  }

  async publishAll(
    events: IDomainEvent[],
    options?: JobsOptions,
  ): Promise<void> {
    await Promise.all(events.map((e) => this.publish(e, options)));
  }

  async close(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
  }
}
`,
      },
      {
        path: "src/infra/queue/event-worker.ts",
        content: `import { randomUUID } from "node:crypto";
import {
  ConfigurationError,
  type DomainEvent,
  DomainEventError,
} from "@woltz/rich-domain";
import { type Job, Worker, type WorkerOptions } from "bullmq";
import type { FastifyInstance } from "fastify";
import type IORedis from "ioredis";
import { QUEUES } from "../../constants";
import type { QueueName } from "./queue-publisher";

type EventHandler<T extends Record<string, unknown>> = (
  event: DomainEvent<T>,
  app: FastifyInstance,
) => Promise<void>;

type QueueWorkerConfig = {
  // biome-ignore lint/suspicious/noExplicitAny: ignore it
  handlers: Map<string, EventHandler<any>>;
  settings?: Omit<WorkerOptions, "connection">;
};

export class BullMQDomainEventWorker {
  private workers: Record<string, QueueWorkerConfig> = {
    [QUEUES.MAIN]: { handlers: new Map(), settings: { concurrency: 50 } },
    [QUEUES.NOTIFICATION_EVENTS]: {
      handlers: new Map(),
      settings: { concurrency: 10 },
    },
    [QUEUES.WORKFLOW_EVENTS]: {
      handlers: new Map(),
      settings: { concurrency: 5 },
    },
  };

  private _app?: FastifyInstance;

  constructor(
    private readonly connection: IORedis,
    app?: FastifyInstance,
  ) {
    this._app = app;
  }

  public on<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(props: {
    queue: QueueName;
    event: new (
      // biome-ignore lint/suspicious/noExplicitAny: ignore it
      ...args: any[]
    ) => DomainEvent<T>;
    handler: EventHandler<T>;
  }): void {
    const { queue, event, handler } = props;
    const worker = this.workers[queue];
    if (!worker) {
      throw new ConfigurationError(\`Queue "\${queue}" not configured\`);
    }
    worker.handlers.set(event.name, handler);
  }

  public async start(): Promise<void> {
    if (!this._app)
      throw new Error("FastifyInstance is required to start the worker.");
    const app = this._app;

    for (const [queueName, config] of Object.entries(this.workers)) {
      new Worker(
        queueName,
        async (job: Job<DomainEvent<unknown>>) => {
          const handler = config.handlers.get(job.data.eventName);
          if (!handler) {
            const token = randomUUID();
            await job.moveToFailed(
              new DomainEventError(
                \`No handler for event: \${job.data.eventName}\`,
              ),
              token,
            );
            return;
          }
          await handler(job.data, app);
        },
        { ...config.settings, connection: this.connection.options },
      );
    }
  }

  async stop(): Promise<void> {
    await this.connection.quit();
  }
}
`,
      },
      {
        path: "src/infra/queue/queue-publisher.ts",
        content: `import { type DomainEvent, DomainEventError } from "@woltz/rich-domain";
import { type JobsOptions, Queue } from "bullmq";
import type IORedis from "ioredis";
import type { QUEUES } from "../../constants";

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export class QueuePublisher {
  private queues: Map<QueueName, Queue> = new Map();

  constructor(private readonly connection: IORedis) {}

  async publish<T extends DomainEvent<unknown>>(
    queueName: QueueName,
    event: T,
    options?: JobsOptions,
  ): Promise<void> {
    const queue = this.getOrCreate(queueName);
    await queue.add(event.eventName, event, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      ...options,
    });
  }

  private getOrCreate(queueName: QueueName): Queue {
    if (!this.queues.has(queueName)) {
      this.queues.set(
        queueName,
        new Queue(queueName, { connection: this.connection.options }),
      );
    }

    const queue = this.queues.get(queueName);
    if (!queue) throw new DomainEventError(\`Queue "\${queueName}" not found\`);

    return queue;
  }

  async close(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
  }
}
`,
      },
    ];
  }

  // ─── DI ───────────────────────────────────────────────────────────────────

  private generateFastifyPlugin(): TemplateFile {
    return {
      path: "src/infra/di/fastify-plugin.ts",
      content: `import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { type Container, container } from "./container";

declare module "fastify" {
  interface FastifyInstance {
    container: Container;
  }
}

const diPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("container", container);
};

export default fp(diPlugin, { name: "di-container" });

export { diPlugin };
`,
    };
  }

  // ─── Application layer ────────────────────────────────────────────────────

  private generateApplicationLayer(): TemplateFile[] {
    return [
      {
        path: "src/application/processor/events.processor.ts",
        content: `import type { FastifyInstance } from "fastify";
import { QUEUES } from "../../constants";
import { UserCreatedEvent } from "../../domain/events/user-created.event";
import type { BullMQDomainEventWorker } from "../../infra/queue/event-worker";

/**
 * Observe-only event handlers — NO mutations.
 * Use this file for logging, sending emails, analytics, etc.
 */
export function registerEventProcessors(worker: BullMQDomainEventWorker): void {
  worker.on({
    queue: QUEUES.MAIN,
    event: UserCreatedEvent,
    handler: async (event, app: FastifyInstance) => {
      app.log.info(
        { email: event.payload.email },
        \`[UserCreatedEvent] user created: \${event.payload.email}\`,
      );
    },
  });
}
`,
      },
      {
        path: "src/application/processor/action.processor.ts",
        content: `import type { BullMQDomainEventWorker } from "../../infra/queue/event-worker";

/**
 * Mutation event handlers — triggered by domain events.
 * Use this file for actions like creating related records, updating projections, etc.
 *
 * Example:
 *   worker.on({
 *     queue: QUEUES.MAIN,
 *     event: UserCreatedEvent,
 *     handler: async (event, app) => {
 *       const { userService } = app.container;
 *       // perform mutation here
 *     },
 *   });
 */
export function registerActionProcessors(
  _worker: BullMQDomainEventWorker,
): void {
  // Register action processors here
}
`,
      },
      {
        path: "src/application/service/user.service.ts",
        content: `import {
  type Criteria,
  EntityAlreadyExistsError,
  EntityNotFoundError,
  type IDomainEventBus,
} from "@woltz/rich-domain";
import { User } from "../../domain/entities/user.aggregate";
import type { UserRepository } from "../../domain/repositories/user.repository";
import { Email } from "../../domain/value-objects/email";

export interface CreateUserInput {
  email: string;
  name: string;
  role?: "USER" | "ADMIN";
}

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: IDomainEventBus,
  ) {}

  async list(criteria: Criteria) {
    return this.userRepository.find(criteria);
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new EntityNotFoundError("User", id);
    return user;
  }

  async create(input: CreateUserInput): Promise<User> {
    const exists = await this.userRepository.findByEmail(input.email);
    if (exists) throw new EntityAlreadyExistsError("User", input.email);

    const user = User.create({
      email: new Email(input.email),
      name: input.name,
      role: input.role ?? "USER",
    });

    await this.userRepository.save(user);
    await user.dispatchAll(this.eventBus);

    return user;
  }

  async changeName(id: string, name: string): Promise<void> {
    const user = await this.getById(id);
    user.updateName(name);
    await this.userRepository.save(user);
  }
}
`,
      },
    ];
  }

  // ─── Presentation layer ───────────────────────────────────────────────────

  private generatePresentationLayer(): TemplateFile[] {
    return [
      {
        path: "src/presentation/controllers/user.controller.ts",
        content: `import { Criteria } from "@woltz/rich-domain";
import {
  CriteriaQuerySchema,
  defineFilters,
  PaginatedResponseSchema,
} from "@woltz/rich-domain-criteria-zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { CreateUserBodySchema, UserResponseSchema } from "../dto/user/user.dto";

const UserParamsSchema = z.object({ id: z.string().uuid() });
const UpdateNameBodySchema = z.object({ name: z.string().min(1) });
const MessageResponseSchema = z.object({ message: z.string() });

const usersQueryParams = defineFilters((q) => ({
  name: q.string(),
  email: q.string(),
}));

export const userController: FastifyPluginAsyncZod = async (app) => {
  const { userService } = app.container;

  app.post("/users", {
    schema: {
      operationId: "createUser",
      body: CreateUserBodySchema,
      response: { "2xx": UserResponseSchema },
    },
    handler: async (request, reply) => {
      const user = await userService.create(request.body);
      return reply.status(201).send(user.toJSON());
    },
  });

  app.get("/users/:id", {
    schema: {
      operationId: "getUserById",
      params: UserParamsSchema,
      response: { "2xx": UserResponseSchema },
    },
    handler: async (request) => {
      const user = await userService.getById(request.params.id);
      return user.toJSON();
    },
  });

  app.route({
    method: "GET",
    url: "/users",
    schema: {
      operationId: "listUsers",
      querystring: CriteriaQuerySchema(usersQueryParams, {
        orderBy: ["name", "email", "id", "createdAt"],
      }),
      response: { "2xx": PaginatedResponseSchema(UserResponseSchema) },
    },
    handler: async (request) => {
      const criteria = Criteria.fromQueryParams(request.query);
      const result = await userService.list(criteria);
      return result.toJSON();
    },
  });

  app.patch("/users/:id/name", {
    schema: {
      operationId: "updateUserName",
      params: UserParamsSchema,
      body: UpdateNameBodySchema,
      response: { "2xx": MessageResponseSchema },
    },
    handler: async (request, reply) => {
      await userService.changeName(request.params.id, request.body.name);
      return reply.send({ message: "Name updated successfully" });
    },
  });
};
`,
      },
      {
        path: "src/presentation/dto/user/user.dto.ts",
        content: `import { z } from "zod";

export const CreateUserBodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
`,
      },
    ];
  }

  // ─── Shared post-install ──────────────────────────────────────────────────

  getPostInstallInstructions(options: TemplateOptions): string[] {
    const { projectName, packageManager: pm } = options;
    const run = pm === "npm" ? "npm run" : pm;
    return [
      `cd ${projectName}`,
      `${pm} install`,
      "cp .env.example .env",
      `${run} docker:up`,
      `${run} db:push`,
      `${run} dev`,
      "",
      `API:     http://localhost:3000`,
      `Swagger: http://localhost:3000/doc`,
    ];
  }
}
