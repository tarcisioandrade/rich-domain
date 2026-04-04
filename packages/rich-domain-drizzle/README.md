# @woltz/rich-domain-drizzle

Drizzle ORM adapter for [@woltz/rich-domain](https://github.com/tarcisioandrade/rich-domain). Provides plug and play integration between rich-domain and Drizzle ORM.

## Installation

```bash
npm install @woltz/rich-domain @woltz/rich-domain-drizzle drizzle-orm
```

## Features

- ✅ **Unit of Work** with AsyncLocalStorage (request isolation)
- ✅ **DrizzleRepository** base class with Criteria support
- ✅ **DrizzleToPersistence** base class with change tracking
- ✅ **@Transactional** decorator for automatic transactions
- ✅ **DrizzleBatchExecutor** for batch change operations
- ✅ **EntitySchemaRegistry** for owned (1:N) and reference (N:N) collections
- ✅ **Junction table support** for explicit N:N mappings

## Quick Start

### 1. Setup

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { DrizzleUnitOfWork } from "@woltz/rich-domain-drizzle";

const db = drizzle(pool, { schema });
const uow = new DrizzleUnitOfWork(db);
```

### 2. Create Repository

```typescript
import { DrizzleRepository, SearchableField } from "@woltz/rich-domain-drizzle";
import { users } from "./schema";

class UserRepository extends DrizzleRepository<User, UserRecord> {
  constructor(uow: DrizzleUnitOfWork) {
    super({
      db,
      table: users,
      toDomainMapper: new UserToDomainMapper(),
      toPersistenceMapper: new UserToPersistenceMapper(uow),
      uow,
    });
  }

  protected get model() {
    return "users"; // key in db.query — matches Drizzle schema export name
  }

  protected getSearchableFields(): SearchableField<UserRecord>[] {
    return ["name", "email"];
  }

  protected getDefaultRelations() {
    return { posts: { with: { tags: { with: { tag: true } } } } };
  }
}
```

### 3. Use It

```typescript
const userRepo = new UserRepository(uow);

// Create
const user = User.create({
  name: "John",
  email: "john@example.com",
  posts: [],
});
await userRepo.save(user);

// Find by ID
const found = await userRepo.findById(user.id.value);

// Find with Criteria
const criteria = Criteria.create<User>()
  .whereEquals("name", "John")
  .orderByAsc("createdAt")
  .paginate(1, 10);

const result = await userRepo.find(criteria);
// result.data → User[]
// result.toJSON().meta.total → total count

// Update (automatic change tracking)
found.updateName("John Updated");
await userRepo.save(found); // Detects and applies only what changed

// Delete
await userRepo.delete(found);
await userRepo.deleteById(userId);
```

---

## API Reference

### DrizzleUnitOfWork

Manages transactions with per-request isolation using AsyncLocalStorage.

```typescript
const uow = new DrizzleUnitOfWork(db);

// Execute in transaction
await uow.transaction(async () => {
  await userRepo.save(user);
  await postRepo.save(post);
  // All or nothing — rolls back on failure
});

// Check if in transaction
uow.isInTransaction(); // boolean

// Get current context
uow.getCurrentContext(); // DrizzleTransactionContext | null
```

---

### DrizzleRepository

Base class for repositories with full Criteria support.

```typescript
abstract class DrizzleRepository<TDomain, TRecord> {
  // Required: key in db.query matching the Drizzle schema export name
  protected abstract get model(): string;

  // Optional: searchable columns for Criteria "search" operator
  protected getSearchableFields(): SearchableField<TRecord>[];

  // Optional: default relations to include in queries
  protected getDefaultRelations(): Record<string, any>;

  // Available methods
  async find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>>;
  async findById(id: string): Promise<TDomain | null>;
  async findOne(criteria: Criteria<TDomain>): Promise<TDomain | null>;
  async count(criteria?: Criteria<TDomain>): Promise<number>;
  async exists(id: string): Promise<boolean>;
  async save(entity: TDomain): Promise<void>;
  async delete(entity: TDomain): Promise<void>;
  async deleteById(id: string): Promise<void>;
}
```

> **Note:** Criteria filters and ordering only support top-level columns of the primary table. Use custom methods with explicit JOINs for cross-table queries.

---

### DrizzleToPersistence

Base class for persistence mappers with change tracking support.

```typescript
abstract class DrizzleToPersistence<TDomain> extends Mapper<TDomain, void> {
  // Required: registry for entity/table/collection mapping
  protected abstract readonly registry: EntitySchemaRegistry;

  // Required: map entity names to Drizzle table objects (and junction tables)
  protected abstract readonly tableMap: Map<string, any>;

  // Required: implement creation
  protected abstract onCreate(entity: TDomain): Promise<void>;

  // Available: current context (transaction or plain db)
  protected get context(): DrizzleClient | DrizzleTransactionClient;
}
```

#### Example

```typescript
import {
  DrizzleToPersistence,
  DrizzleUnitOfWork,
  Transactional,
} from "@woltz/rich-domain-drizzle";
import { EntitySchemaRegistry } from "@woltz/rich-domain";
import { users, posts, tags, postsToTags } from "./schema";

const userRegistry = new EntitySchemaRegistry()
  .register({
    entity: "User",
    table: "users",
    collections: {
      posts: { type: "owned", entity: "Post" },
    },
  })
  .register({
    entity: "Post",
    table: "posts",
    parentFk: { field: "authorId", parentEntity: "User" },
    collections: {
      tags: {
        type: "reference",
        entity: "Tag",
        junction: {
          table: "posts_to_tags", // must match tableMap key
          sourceKey: "postId",
          targetKey: "tagId",
        },
      },
    },
  })
  .register({ entity: "Tag", table: "tags" });

class UserToPersistenceMapper extends DrizzleToPersistence<User> {
  protected readonly registry = userRegistry;

  protected readonly tableMap = new Map<string, any>([
    ["User", users],
    ["Post", posts],
    ["Tag", tags],
    ["posts_to_tags", postsToTags], // junction table key must match registry
  ]);

  constructor(uow: DrizzleUnitOfWork) {
    super(uow);
  }

  protected getDb() {
    return getDb();
  }

  @Transactional()
  protected async onCreate(user: User): Promise<void> {
    await this.context.insert(users).values({
      id: user.id.value,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    if (user.posts.length > 0) {
      await this.context.insert(posts).values(
        user.posts.map((p) => ({
          id: p.id.value,
          title: p.title,
          content: p.content,
          published: p.published,
          authorId: user.id.value,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }))
      );
    }
  }
  // onUpdate is handled automatically by DrizzleBatchExecutor
}
```

---

### EntitySchemaRegistry — Collection Types

| Type        | Behavior                                               | Junction required? |
| ----------- | ------------------------------------------------------ | ------------------ |
| `owned`     | 1:N — child rows belong to the parent; deletes cascade | No                 |
| `reference` | N:N — rows in a junction table                         | **Yes — always**   |

Unlike Prisma, Drizzle does not manage implicit junction tables. Every `reference` collection must provide a `junction` config. Omitting it throws `MissingJunctionConfigError`.

---

### @Transactional Decorator

Wraps a method in a transaction automatically.

```typescript
import { Transactional } from "@woltz/rich-domain-drizzle";

class CreateUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly uow: DrizzleUnitOfWork // Required!
  ) {}

  @Transactional()
  async execute(input: CreateUserInput): Promise<User> {
    const user = User.create({ ...input, posts: [] });
    await this.userRepo.save(user);
    return user;
  }
}
```

| Scenario               | Behavior                |
| ---------------------- | ----------------------- |
| Direct call            | Creates new transaction |
| Already in transaction | Reuses existing one     |
| Error thrown           | Automatic rollback      |

The class must expose a `uow` property of type `DrizzleUnitOfWork` for the decorator to find it.

---

### DrizzleBatchExecutor

Executes batch operations from `AggregateChanges` in the correct order for referential integrity:

1. **Deletes** — leaf → root (depth DESC)
2. **Creates** — root → leaf (depth ASC)
3. **Updates** — any order

`onUpdate` in `DrizzleToPersistence` is called automatically; you do not need to instantiate the executor directly.

---

## Connect / Disconnect (N:N)

```typescript
// Connect — adds a row to the junction table
const post = await postRepo.findById(postId);
post.addTag(new Tag({ id: new Id(tagId) }));
await postRepo.save(post);

// Disconnect — removes the row from the junction table
post.removeTag(new Tag({ id: new Id(tagId) }));
await postRepo.save(post);
```

---

## Transactions

```typescript
await uow.transaction(async () => {
  const user = User.create({ name: "Alice", email: "alice@example.com", posts: [] });
  await userRepo.save(user);

  const post = Post.restore({ ... });
  await postRepo.save(post);
  // Both committed atomically, or both rolled back on error
});
```

---

## Limitations

- **Criteria dot-field paths are not supported.** Filters and ordering must reference top-level columns of the primary table. `"posts.title"` or `"profile.name"` throws `DrizzleAdapterError`. Add custom repository methods with explicit JOINs instead.
- **`contains` / `startsWith` / `endsWith`** use `ILIKE` — PostgreSQL only.

---

## Error Reference

| Error                        | When thrown                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `TableNotFoundError`         | `tableMap` key not found for an entity or junction name            |
| `MissingJunctionConfigError` | `reference` collection has no `junction` configured                |
| `BatchOperationError`        | DB error during a batch create, update, or delete                  |
| `NoRecordsAffectedError`     | `delete()` / `deleteById()` matched 0 rows                         |
| `DrizzleAdapterError`        | Unsupported Criteria operator, dot-field path, or column not found |

---

## Full Example

See the [fastify-with-drizzle example](https://github.com/tarcisioandrade/rich-domain/tree/main/examples/backend/fastify-with-drizzle) for a complete working application.

---

## License

MIT
