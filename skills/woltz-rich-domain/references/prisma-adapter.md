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

## PrismaRepository

```typescript
import { PrismaRepository } from "@woltz/rich-domain-prisma";
import { Criteria } from "@woltz/rich-domain";

class UserRepository extends PrismaRepository<User> {
  // Required: Prisma model name (lowercase)
  protected readonly model = "user";

  // Optional: Default relations to include
  protected readonly includes = { posts: true, profile: true };

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
    const data = await this.modelAccessor.findUnique({
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
import { PrismaToPersistence, PrismaBatchExecutor, EntitySchemaRegistry } from "@woltz/rich-domain-prisma";

const schemaRegistry = new EntitySchemaRegistry()
  .register({ entity: "User", table: "user" })
  .register({
    entity: "Post",
    table: "post",
    fields: { content: "main_content" },
    parentFk: { field: "authorId", parentEntity: "User" },
  });

class UserToPersistenceMapper extends PrismaToPersistence<User> {
  protected readonly registry = schemaRegistry;

  // Handle new aggregate creation
  protected async onCreate(user: User): Promise<void> {
    await this.context.user.create({
      data: {
        id: user.id.value,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        posts: user.posts.length ? {
          createMany: {
            data: user.posts.map((post) => ({
              id: post.id.value,
              title: post.title,
              main_content: post.content,
              authorId: user.id.value,
            })),
          },
        } : undefined,
      },
    });
  }

  // Handle existing aggregate updates
  protected async onUpdate(user: User, changes: AggregateChanges): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
      rootId: user.id.value,
      dataMappers: {
        Post: (item) => ({
          id: item.data.id.value,
          title: item.data.title,
          main_content: item.data.content,
          authorId: item.parentId,
        }),
      },
    });

    await executor.execute(changes);
  }
}
```

## PrismaBatchExecutor

Executes batch operations from AggregateChanges:

```typescript
const executor = new PrismaBatchExecutor(context, {
  // Schema registry for table/field mapping
  registry: schemaRegistry,

  // Aggregate root ID (used as default parentId)
  rootId: user.id.value,

  // Data mappers for each entity type
  dataMappers: {
    Post: (item) => ({
      id: item.data.id.value,
      title: item.data.title,
      authorId: item.parentId,
    }),
    Comment: (item) => ({
      id: item.data.id.value,
      text: item.data.text,
      postId: item.parentId,
    }),
  },
});

await executor.execute(changes);
```

**Execution Order:**
1. Deletes (leaf → root, depth DESC)
2. Creates (root → leaf, depth ASC)
3. Updates (any order)

## Transactions

### @Transactional Decorator

```typescript
import { Transactional } from "@woltz/rich-domain-prisma";

class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly uow: PrismaUnitOfWork // Required!
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
      posts: record.posts?.map(p => new Post({
        id: Id.from(p.id),
        title: p.title,
        content: p.main_content,  // Map column back to domain
      })) ?? [],
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

// schema-registry.ts
export const schemaRegistry = new EntitySchemaRegistry()
  .register({ entity: "User", table: "user" })
  .register({
    entity: "Post",
    table: "post",
    fields: { content: "main_content" },
    parentFk: { field: "authorId", parentEntity: "User" },
  });

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
export class UserToPersistenceMapper extends PrismaToPersistence<User> {
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

  protected async onUpdate(user: User, changes: AggregateChanges): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
      rootId: user.id.value,
      dataMappers: {
        Post: (item) => ({
          id: item.data.id.value,
          title: item.data.title,
          main_content: item.data.content,
          published: item.data.published,
          authorId: item.parentId,
        }),
      },
    });
    await executor.execute(changes);
  }
}

// user.repository.ts
export class UserRepository extends PrismaRepository<User> {
  protected readonly model = "user";
  protected readonly includes = { posts: true };

  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {
    super(
      new UserToPersistenceMapper(prisma, uow),
      new UserToDomainMapper(),
      prisma,
      uow
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await this.modelAccessor.findUnique({
      where: { email },
      include: this.includes,
    });
    return data ? this.mapperToDomain.build(data) : null;
  }
}

// create-user.use-case.ts
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly uow: PrismaUnitOfWork
  ) {}

  @Transactional()
  async execute(input: CreateUserInput): Promise<User> {
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
