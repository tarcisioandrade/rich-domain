# @woltz/rich-domain-prisma

Prisma adapter for [@woltz/rich-domain](https://github.com/woltz/rich-domain). Provides plug and play integration between rich-domain and Prisma ORM.

## Installation

```bash
npm install @woltz/rich-domain @woltz/rich-domain-prisma
```

## Features

- ✅ **Unit of Work** with AsyncLocalStorage (request isolation)
- ✅ **PrismaRepository** base class with Criteria support
- ✅ **PrismaToPersistence** base class with change tracking
- ✅ **@Transactional** decorator for automatic transactions
- ✅ **BatchExecutor** for batch change operations
- ✅ **Zero config** - works out of the box

## Quick Start

### 1. Setup

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaUnitOfWork } from "@woltz/rich-domain-prisma";

const prisma = new PrismaClient();
const uow = new PrismaUnitOfWork(prisma);
```

### 2. Create Repository

```typescript
import { PrismaRepository } from "@woltz/rich-domain-prisma";

class UserRepository extends PrismaRepository<User> {
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
}
```

### 3. Use It

```typescript
const userRepository = new UserRepository(prisma, uow);

// Create
const user = User.create({ name: "John", email: "john@example.com", posts: [] });
await userRepository.save(user);

// Find by ID
const found = await userRepository.findById(user.id.value);

// Find with Criteria
const criteria = Criteria.create<User>()
  .where("name", "contains", "John")
  .orderBy("createdAt", "desc")
  .paginate(1, 10);

const result = await userRepository.find(criteria);

// Update (automatic change tracking)
found.updateName("John Updated");
found.addPost(new Post({ ... }));
await userRepository.save(found); // Detects and applies only what changed

// Delete
await userRepository.delete(found);
```

---

## API Reference

### PrismaUnitOfWork

Manages transactions with per-request isolation using AsyncLocalStorage.

```typescript
const uow = new PrismaUnitOfWork(prisma);

// Execute in transaction
await uow.transaction(async () => {
  await userRepository.save(user);
  await orderRepository.save(order);
  // All or nothing - rolls back on failure
});

// Check if in transaction
uow.isInTransaction(); // boolean

// Get current context
uow.getCurrentContext(); // PrismaTransactionContext | null
```

#### Request Isolation

`AsyncLocalStorage` ensures each HTTP request has its own transaction context:

```typescript
// Request 1: starts transaction
await uow.transaction(async () => {
  // ...
});

// Request 2: NOT affected by Request 1's transaction
await userRepository.findById(id); // Uses normal connection
```

---

### PrismaRepository

Base class for repositories with Criteria support.

```typescript
abstract class PrismaRepository<TDomain, TPersistence> {
  // Required: Prisma model name
  protected abstract get model(): string;

  // Optional: relations to include
  protected readonly includes: Record<string, any> = {};

  // Available methods
  async find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>>;
  async findById(id: string): Promise<TDomain | null>;
  async findOne(criteria: Criteria<TDomain>): Promise<TDomain | null>;
  async count(criteria?: Criteria<TDomain>): Promise<number>;
  async exists(id: string): Promise<boolean>;
  async save(entity: TDomain): Promise<void>;
  async delete(entity: TDomain): Promise<void>;
  async deleteById(id: string): Promise<void>;
  async transaction<T>(work: () => Promise<T>): Promise<T>;
}
```

#### Complete Example

```typescript
import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";
import { Criteria } from "@woltz/rich-domain";

class UserRepository extends PrismaRepository<User, UserPersistence> {
  protected readonly model = "user";
  protected readonly includes = {
    posts: true,
    profile: true,
  };

  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {
    super(
      new UserToPersistenceMapper(prisma, uow),
      new UserToDomainMapper(),
      prisma,
      uow
    );
  }

  // Custom methods
  async findByEmail(email: string): Promise<User | null> {
    const data = await this.modelAccessor.findUnique({
      where: { email },
      include: this.includes,
    });
    return data ? this.mapperToDomain.build(data) : null;
  }

  async findActiveUsers(): Promise<User[]> {
    const criteria = Criteria.create<User>()
      .where("status", "equals", "active")
      .orderBy("createdAt", "desc");

    const result = await this.find(criteria);
    return result.data;
  }
}
```

---

### PrismaToPersistence

Base class for persistence mappers with change tracking support.

```typescript
abstract class PrismaToPersistence<TDomain> extends Mapper<TDomain, void> {
  // Required: registry for field mapping
  protected abstract readonly registry: EntitySchemaRegistry;

  // Required: implement creation
  protected abstract onCreate(entity: TDomain): Promise<void>;

  // Required: implement update
  protected abstract onUpdate(
    entity: TDomain,
    changes: AggregateChanges
  ): Promise<void>;

  // Available: current context (transaction or prisma)
  protected get context(): PrismaClient | Transaction;
}
```

#### Complete Example

```typescript
import { PrismaToPersistence, PrismaBatchExecutor } from "@woltz/rich-domain-prisma";
import { EntitySchemaRegistry, AggregateChanges } from "@woltz/rich-domain";

const schemaRegistry = new EntitySchemaRegistry()
  .register({
    entity: "User",
    table: "user",
  })
  .register({
    entity: "Post",
    table: "post",
    fields: {
      content: "main_content", // Field with different name in database
    },
    parentFk: {
      field: "authorId",
      parentEntity: "User",
    },
  });

class UserToPersistenceMapper extends PrismaToPersistence<User> {
  protected readonly registry = schemaRegistry;

  protected async onCreate(user: User): Promise<void> {
    await this.context.user.create({
      data: {
        id: user.id.value,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        posts: user.posts.length
          ? {
              createMany: {
                data: user.posts.map((post) => ({
                  id: post.id.value,
                  title: post.title,
                  main_content: post.content,
                  published: post.published,
                  authorId: user.id.value,
                  createdAt: post.createdAt,
                  updatedAt: post.updatedAt,
                })),
              },
            }
          : undefined,
      },
    });
  }

  protected async onUpdate(
    user: User,
    changes: AggregateChanges
  ): Promise<void> {
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
          createdAt: item.data.createdAt,
          updatedAt: item.data.updatedAt,
        }),
      },
    });

    await executor.execute(changes);
  }
}
```

---

### @Transactional Decorator

Decorator that automatically wraps a method in a transaction.

```typescript
import { Transactional } from "@woltz/rich-domain-prisma";

class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly uow: PrismaUnitOfWork // Required!
  ) {}

  @Transactional()
  async execute(input: CreateUserInput): Promise<User> {
    // Everything here runs in a transaction automatically
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error("User already exists");
    }

    const user = User.create({ ...input, posts: [] });
    await this.userRepository.save(user);

    return user;
  }
}
```

#### Behavior

| Scenario               | Behavior                |
| ---------------------- | ----------------------- |
| Direct call            | Creates new transaction |
| Already in transaction | Reuses existing one     |
| Error thrown           | Automatic rollback      |

#### Requirements

The class must have a `uow` property of type `PrismaUnitOfWork`:

```typescript
class MyService {
  constructor(
    private readonly uow: PrismaUnitOfWork // ✅ Found by decorator
  ) {}

  @Transactional()
  async myMethod() { ... }
}
```

---

### PrismaBatchExecutor

Executes batch operations from `AggregateChanges`.

```typescript
import { PrismaBatchExecutor } from "@woltz/rich-domain-prisma";

const executor = new PrismaBatchExecutor(context, {
  // Registry for table/field mapping
  registry: schemaRegistry,

  // Aggregate root ID (used as default parentId)
  rootId: user.id.value,

  // Custom data mappers per entity (optional)
  dataMappers: {
    Post: (item) => ({
      id: item.data.id.value,
      title: item.data.title,
      authorId: item.parentId,
    }),
  },
});

await executor.execute(changes);
```

#### Execution Order

The executor respects the correct order for referential integrity:

1. **Deletes** - Leaf → Root (depth DESC)
2. **Creates** - Root → Leaf (depth ASC)
3. **Updates** - Any order

---

## Recipes

### Use Case with Transaction

```typescript
class TransferMoneyUseCase {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly uow: PrismaUnitOfWork
  ) {}

  @Transactional()
  async execute(input: { from: string; to: string; amount: number }) {
    const fromAccount = await this.accountRepository.findById(input.from);
    const toAccount = await this.accountRepository.findById(input.to);

    if (!fromAccount || !toAccount) {
      throw new Error("Account not found");
    }

    fromAccount.withdraw(input.amount);
    toAccount.deposit(input.amount);

    await this.accountRepository.save(fromAccount);
    await this.accountRepository.save(toAccount);

    // If any operation fails, everything is rolled back
  }
}
```

### Repository with Custom Methods

```typescript
class OrderRepository extends PrismaRepository<Order> {
  protected readonly model = "order";
  protected readonly includes = {
    items: true,
    customer: true,
  };

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const data = await this.modelAccessor.findMany({
      where: { customerId },
      include: this.includes,
      orderBy: { createdAt: "desc" },
    });

    return data.map((item) => this.mapperToDomain.build(item));
  }

  async findPendingOrders(): Promise<Order[]> {
    const criteria = Criteria.create<Order>()
      .where("status", "equals", "pending")
      .where("createdAt", "greaterThan", subDays(new Date(), 7));

    const result = await this.find(criteria);
    return result.data;
  }
}
```

### Mapper with Complex Relations

```typescript
class OrderToPersistenceMapper extends PrismaToPersistence<Order> {
  protected readonly registry = new EntitySchemaRegistry()
    .register({ entity: "Order", table: "order" })
    .register({
      entity: "OrderItem",
      table: "orderItem",
      parentFk: { field: "orderId", parentEntity: "Order" },
    })
    .register({
      entity: "OrderItemAddon",
      table: "orderItemAddon",
      parentFk: { field: "orderItemId", parentEntity: "OrderItem" },
    });

  protected async onCreate(order: Order): Promise<void> {
    await this.context.order.create({
      data: {
        id: order.id.value,
        customerId: order.customerId,
        status: order.status,
        total: order.total,
        items: {
          create: order.items.map((item) => ({
            id: item.id.value,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            addons: {
              create: item.addons.map((addon) => ({
                id: addon.id.value,
                name: addon.name,
                price: addon.price,
              })),
            },
          })),
        },
      },
    });
  }

  protected async onUpdate(order: Order, changes: AggregateChanges): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
      rootId: order.id.value,
      dataMappers: {
        OrderItem: (item) => ({ ... }),
        OrderItemAddon: (item) => ({ ... }),
      },
    });

    await executor.execute(changes);
  }
}
```

---

## Testing

### Mocking the UnitOfWork

```typescript
import { PrismaUnitOfWork } from "@woltz/rich-domain-prisma";

describe("CreateUserUseCase", () => {
  let mockUow: jest.Mocked<PrismaUnitOfWork>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUow = {
      transaction: jest.fn((work) => work()),
      getCurrentContext: jest.fn(),
      isInTransaction: jest.fn(),
    } as any;

    mockUserRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
    } as any;
  });

  it("should create user", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const useCase = new CreateUserUseCase(mockUserRepository, mockUow);
    const user = await useCase.execute({
      name: "John",
      email: "john@test.com",
    });

    expect(user.name).toBe("John");
    expect(mockUserRepository.save).toHaveBeenCalled();
  });
});
```

---

## License

MIT
