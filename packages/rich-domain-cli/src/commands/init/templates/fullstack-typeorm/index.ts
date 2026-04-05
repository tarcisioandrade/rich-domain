import { TemplateFile, TemplateMetadata } from "../base.template.js";
import { FullstackBaseTemplate } from "../fullstack-base/index.js";

export class FullstackTypeORMTemplate extends FullstackBaseTemplate {
  readonly metadata: TemplateMetadata = {
    name: "fullstack-typeorm",
    description: "Fastify + TypeORM + BullMQ + Zod — DDD starter",
    version: "1.0.0",
    tags: ["fastify", "typeorm", "bullmq", "zod", "ddd"],
  };

  // ─── ORM server hooks ─────────────────────────────────────────────────────

  protected getDbImportLines(): string {
    return `import { AppDataSource, initializeDatabase } from "./infra/database/db";\n`;
  }

  protected getDbInitCall(): string {
    return `await initializeDatabase();`;
  }

  protected getDbCloseCall(): string {
    return `await AppDataSource.destroy();`;
  }

  // ─── Dependencies ─────────────────────────────────────────────────────────

  getDependencies(): Record<string, string> {
    return {
      "@fastify/cors": "^11.0.0",
      "@fastify/swagger": "^9.6.0",
      "@fastify/swagger-ui": "^5.2.0",
      "@woltz/rich-domain": "^1.8.7",
      "@woltz/rich-domain-criteria-zod": "^0.1.5",
      "@woltz/rich-domain-typeorm": "^0.1.5",
      bullmq: "^5.64.0",
      fastify: "^5.5.0",
      dotenv: "^17.4.0",
      "fastify-plugin": "^5.1.0",
      "fastify-type-provider-zod": "^6.1.0",
      ioredis: "^5.6.1",
      pg: "^8.16.0",
      "pino-pretty": "^13.0.0",
      "reflect-metadata": "^0.2.2",
      typeorm: "^0.3.28",
      zod: "^4.1.5",
    };
  }

  getDevDependencies(): Record<string, string> {
    return {
      "@types/node": "^22.10.0",
      "@types/pg": "^8.11.0",
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
      "db:seed": "tsx src/infra/database/seed/index.ts",
      "docker:up": "docker-compose up -d",
      "docker:down": "docker-compose down",
    };
  }

  // ─── tsconfig override (decorators needed for TypeORM) ────────────────────

  protected generateTsConfig(): TemplateFile {
    const config = {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        lib: ["ES2022"],
        moduleResolution: "bundler",
        rootDir: "./src",
        outDir: "./dist",
        declaration: true,
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
    return { path: "tsconfig.json", content: JSON.stringify(config, null, 2) };
  }

  // ─── ORM files ────────────────────────────────────────────────────────────

  protected generateOrmFiles(): TemplateFile[] {
    return [
      {
        path: "src/infra/database/typeorm/entities/User.ts",
        content: `import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", default: "USER" })
  role!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
`,
      },
      {
        path: "src/infra/database/typeorm/entities/index.ts",
        content: `export { UserEntity } from "./User";
`,
      },
    ];
  }

  // ─── DB module ────────────────────────────────────────────────────────────

  protected generateDbModule(): TemplateFile[] {
    return [
      {
        path: "src/infra/database/db.ts",
        content: `import "reflect-metadata";
import { DataSource } from "typeorm";
import { TypeORMUnitOfWork } from "@woltz/rich-domain-typeorm";
import { UserEntity } from "./typeorm/entities/User";
import { env } from "../../env";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  synchronize: env.NODE_ENV === "development",
  logging: env.NODE_ENV === "development",
  entities: [UserEntity],
  migrations: [],
});

let uowInstance: TypeORMUnitOfWork | null = null;

export async function initializeDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    uowInstance = new TypeORMUnitOfWork(AppDataSource);
  }
}

export function getUoW(): TypeORMUnitOfWork {
  if (!uowInstance) throw new Error("Database not initialized.");
  return uowInstance;
}

export function getDataSource(): DataSource {
  if (!AppDataSource.isInitialized) throw new Error("Database not initialized.");
  return AppDataSource;
}
`,
      },
    ];
  }

  // ─── Schemas ──────────────────────────────────────────────────────────────

  protected generateSchemas(): TemplateFile[] {
    return [
      {
        path: "src/infra/database/schemas/user.schema.ts",
        content: `export type { UserEntity } from "../typeorm/entities/User";
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
import type { UserEntity } from "../typeorm/entities/User";

export class UserToDomainMapper extends Mapper<UserEntity, User> {
  build(raw: UserEntity): User {
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
import {
  TypeORMToPersistence
} from "@woltz/rich-domain-typeorm";
import type { EntityManager } from "typeorm";
import type { User } from "../../../domain/entities/user.aggregate";
import { UserEntity } from "../typeorm/entities/User";

export class UserToPersistenceMapper extends TypeORMToPersistence<User> {
  protected readonly registry = new EntitySchemaRegistry().register({
    entity: "User",
    table: "users",
  });

  protected readonly entityClasses = new Map<string, new () => any>([
    ["User", UserEntity],
  ]);

  protected async onCreate(user: User, em: EntityManager): Promise<void> {
    const entity = new UserEntity();
    entity.id = user.id.value;
    entity.email = user.email;
    entity.name = user.name;
    entity.role = user.role;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;
    await em.save(entity);
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
        path: "src/infra/database/repositories/typeorm-user.repository.ts",
        content: `import { SearchableField, TypeORMRepository, TypeORMUnitOfWork } from "@woltz/rich-domain-typeorm";
import { Repository } from "typeorm";
import { User } from "../../../domain/entities/user.aggregate";
import { UserRepository } from "../../../domain/repositories/user.repository";
import { UserEntity } from "../typeorm/entities/User";
import { UserToDomainMapper } from "../mappers/user-to-domain.mapper";
import { UserToPersistenceMapper } from "../mappers/user-to-persistence.mapper";

export class TypeORMUserRepository
  extends TypeORMRepository<User, UserEntity>
  implements UserRepository
{
  constructor(repo: Repository<UserEntity>, uow: TypeORMUnitOfWork) {
    super({
      typeormRepository: repo,
      toDomainMapper: new UserToDomainMapper(),
      toPersistenceMapper: new UserToPersistenceMapper(uow),
      uow,
    });
  }

  protected getSearchableFields(): SearchableField<UserEntity>[] {
    return ["name", "email"];
  }

  protected getDefaultRelations(): string[] {
    return [];
  }

  async findByEmail(email: string): Promise<User | null> {
    const raw = await this.typeormRepo.findOne({ where: { email } });
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
      content: `import type { IDomainEventBus } from "@woltz/rich-domain";
import type { TypeORMUnitOfWork } from "@woltz/rich-domain-typeorm";
import { UserService } from "../../application/service/user.service";
import { AppDataSource, getUoW } from "../database/db";
import { TypeORMUserRepository } from "../database/repositories/typeorm-user.repository";
import { UserEntity } from "../database/typeorm/entities/User";
import { connection } from "../queue/connection";
import { BullMQEventBus } from "../queue/event-bus";

export class Container {
  private static instance: Container;
  private services = new Map<string, { factory: () => any; instance: any }>();

  private constructor() {
    this.register("unitOfWork", () => getUoW());
    this.register("eventBus", () => new BullMQEventBus(connection));
    this.register(
      "userRepository",
      () =>
        new TypeORMUserRepository(
          AppDataSource.getRepository(UserEntity),
          this.resolve<TypeORMUnitOfWork>("unitOfWork"),
        ),
    );
    this.register(
      "userService",
      () =>
        new UserService(
          this.resolve<TypeORMUserRepository>("userRepository"),
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
