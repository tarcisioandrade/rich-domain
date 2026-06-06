# Prisma Adapter

Integration with Prisma ORM for @woltz/rich-domain.

## Installation

```bash
npm install @woltz/rich-domain @woltz/rich-domain-prisma
```

## Setup

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaUnitOfWork } from "@woltz/rich-domain-prisma";

const prisma = new PrismaClient();
const uow = new PrismaUnitOfWork(prisma);
```

## Prisma Entity Schema

```typescript
import type { Prisma } from "@prisma/client";

export type PrismaUserSchema = Prisma.UserGetPayload<{
  include: {
    profile: true;
  };
}>;
```

## PrismaRepository

**Domain**

```typescript
import type { WriteAndRead } from "@woltz/rich-domain";
import type { User } from "../entities";

export interface IUserRepository extends WriteAndRead<User> {
  findByEmail(email: string): Promise<User | null>;
}
```

**Implementation**

```typescript
import { PrismaRepository } from "@woltz/rich-domain-prisma";
import { Criteria } from "@woltz/rich-domain";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { PrismaUserSchema } from "../schemas/user.schema";
import type { IUserRepository } from "../domain/repository";

class UserRepository
  extends PrismaRepository<User, PrismaUserSchema, PrismaClient>
  implements IUserRepository
{
  // Required: Prisma model name (lowercase)
  protected readonly model = "user";

  // Optional: Default relations to include
  protected readonly includes = {
    posts: true,
    profile: true,
  } satisfies Prisma.UserInclude;

  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {
    super(
      new UserToPersistenceMapper(prisma, uow),
      new UserToDomainMapper(),
      prisma,
      uow
    );
  }

  // Optional: Configure search fields
  protected generateSearchQuery(search: string) {
    return [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Custom methods
  async findByEmail(email: string): Promise<User | null> {
    const data = await this.context.user.findUnique({
      where: { email },
      include: this.includes,
    });
    return data ? this.mapperToDomain.build(data) : null;
  }
}
```

### Available Methods

```typescript
interface PrismaRepository<T> {
  find(criteria: Criteria<T>): Promise<PaginatedResult<T>>;
  findById(id: string): Promise<T | null>;
  findOne(criteria: Criteria<T>): Promise<T | null>;
  count(criteria?: Criteria<T>): Promise<number>;
  exists(id: string): Promise<boolean>;
  save(entity: T): Promise<void>;
  delete(entity: T): Promise<void>;
  deleteById(id: string): Promise<void>;
}
```

## PrismaToPersistence Mapper

```typescript
import {
  PrismaToPersistence,
  PrismaBatchExecutor,
  type AggregateChanges,
} from "@woltz/rich-domain-prisma";
import { EntitySchemaRegistry } from "@woltz/rich-domain";
import type { PrismaClient } from "@prisma/client";

const schemaRegistry = new EntitySchemaRegistry()
  .register({ entity: "User", table: "user" })
  .register({
    entity: "Post",
    table: "post",
    fields: { content: "main_content" },
    parentFk: { field: "authorId", parentEntity: "User" },
  });

class UserToPersistenceMapper extends PrismaToPersistence<User, PrismaClient> {
  protected readonly registry = schemaRegistry;

  // Handle new aggregate creation
  protected async onCreate(user: User): Promise<void> {
    await this.context.user.create({
      data: {
        id: user.id.value,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        posts: user.posts.length
          ? {
              createMany: {
                data: user.posts.map((post) => ({
                  id: post.id.value,
                  title: post.title,
                  main_content: post.content,
                  authorId: user.id.value,
                })),
              },
            }
          : undefined,
      },
    });
  }

  // onUpdate uses PrismaBatchExecutor by default — override only if needed
}
```

## PrismaBatchExecutor

Executes batch operations from AggregateChanges:

```typescript
const executor = new PrismaBatchExecutor(context, {
  // Schema registry for table/field mapping
  registry: schemaRegistry,
});

await executor.execute(changes);
```

**Execution Order:**

1. Deletes (leaf → root, depth DESC)
2. Creates (root → leaf, depth ASC)
3. Updates (any order)

The executor uses the registry's `mapEntity()` for creates and `mapFields()` for updates.

## Transactions

### @Transactional Decorator

```typescript
import { Transactional } from "@woltz/rich-domain-prisma";

class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly uow: PrismaUnitOfWork // Or use inline @Transactional(uow)
  ) {}

  @Transactional()
  async execute(input: CreateOrderInput): Promise<Order> {
    // Everything here runs in a transaction
    const order = Order.create(input);

    for (const item of order.items) {
      await this.inventoryService.reserve(item.productId, item.quantity);
    }

    await this.orderRepository.save(order);

    return order;
    // Auto-commits on success
    // Auto-rolls back on any error
  }
}
```

### Manual Transaction

```typescript
await uow.transaction(async () => {
  await userRepository.save(user);
  await orderRepository.save(order);
  await paymentService.charge(order.total);
  // All or nothing
});
```

### Nested Transactions

Decorator detects existing transaction and reuses it:

```typescript
@Transactional()
async outer() {
  await this.methodA();  // Reuses transaction
  await this.methodB();  // Reuses transaction
}

@Transactional()
async methodA() { /* ... */ }

@Transactional()
async methodB() { /* ... */ }
```

## Domain Mapper (Persistence → Domain)

```typescript
import { Mapper, Id } from "@woltz/rich-domain";

class UserToDomainMapper extends Mapper<UserRecord, User> {
  build(record: UserRecord): User {
    return new User({
      id: Id.from(record.id),
      email: record.email,
      name: record.name,
      posts:
        record.posts?.map(
          (p) =>
            new Post({
              id: Id.from(p.id),
              title: p.title,
              content: p.main_content, // Map column back to domain
            })
        ) ?? [],
      createdAt: record.createdAt,
    });
  }
}
```

## Complete Example

```typescript
// prisma/schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id           String  @id @default(uuid())
  title        String
  main_content String
  published    Boolean @default(false)
  authorId     String
  author       User    @relation(fields: [authorId], references: [id])
}

// user-to-domain.mapper.ts
export class UserToDomainMapper extends Mapper<UserRecord, User> {
  build(record: UserRecord): User {
    return new User({
      id: Id.from(record.id),
      email: record.email,
      name: record.name,
      posts: record.posts?.map(p => new Post({
        id: Id.from(p.id),
        title: p.title,
        content: p.main_content,
        published: p.published,
      })) ?? [],
      createdAt: record.createdAt,
    });
  }
}

// user-to-persistence.mapper.ts
const schemaRegistry = new EntitySchemaRegistry()
  .register({ entity: "User", table: "user" })
  .register({
    entity: "Post",
    table: "post",
    fields: { content: "main_content" },
    parentFk: { field: "authorId", parentEntity: "User" },
  });

export class UserToPersistenceMapper extends PrismaToPersistence<User, PrismaClient> {
  protected readonly registry = schemaRegistry;

  protected async onCreate(user: User): Promise<void> {
    await this.context.user.create({
      data: {
        id: user.id.value,
        email: user.email,
        name: user.name,
        posts: {
          createMany: {
            data: user.posts.map(p => ({
              id: p.id.value,
              title: p.title,
              main_content: p.content,
              published: p.published,
              authorId: user.id.value,
            })),
          },
        },
      },
    });
  }

  // onUpdate uses PrismaBatchExecutor by default — override only if needed
}

// user.repository.ts (Implementation)
export class UserRepository extends PrismaRepository<User, PrismaUserSchema, PrismaClient> implements IUserRepository {
  protected readonly model = "user";
  protected readonly includes = { posts: true } satisfies Prisma.UserIncludes;

  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {
    super(
      new UserToPersistenceMapper(prisma, uow),
      new UserToDomainMapper(),
      prisma,
      uow
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await this.context.user.findUnique({
      where: { email },
      include: this.includes,
    });
    return data ? this.mapperToDomain.build(data) : null;
  }
}

// user.service.ts
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly uow: PrismaUnitOfWork
  ) {}

  @Transactional()
  async create(input: CreateUserInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error("Email already in use");
    }

    const user = new User({
      email: input.email,
      name: input.name,
      posts: [],
    });

    await this.userRepository.save(user);
    return user;
  }
}
```
