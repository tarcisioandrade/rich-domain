# Drizzle Adapter

Integration with Drizzle ORM for `@woltz/rich-domain`.

## Installation

```bash
npm install @woltz/rich-domain @woltz/rich-domain-drizzle drizzle-orm
```

## Key Differences from Prisma Adapter

| Aspect | Prisma | Drizzle |
|--------|--------|---------|
| Junction tables (N:N) | Automatic | Always requires explicit `junction` config |
| `onCreate` | Optional | **Required** — no automatic insert |
| `onUpdate` | Required | **Optional** — defaults to `DrizzleBatchExecutor` |
| Query API | `context.model.findMany()` | `context.query[model].findMany()` |
| Field mapping | `fields` in registry | Same |

## Setup

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DrizzleUnitOfWork } from "@woltz/rich-domain-drizzle";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

export const uow = new DrizzleUnitOfWork(db);
```

## EntitySchemaRegistry

Maps entities to Drizzle tables. Required for `DrizzleToPersistence` and `DrizzleBatchExecutor`.

```typescript
import { EntitySchemaRegistry } from "@woltz/rich-domain";

const registry = new EntitySchemaRegistry()
  .register({
    entity: "User",
    table: "users",
    collections: {
      posts: { type: "owned", entity: "Post" },  // 1:N — lifecycle-managed
    },
  })
  .register({
    entity: "Post",
    table: "posts",
    parentFk: { field: "authorId", parentEntity: "User" },
    collections: {
      tags: {
        type: "reference",  // N:N — only the link is managed
        entity: "Tag",
        junction: {
          table: "posts_to_tags",  // must match tableMap key
          sourceKey: "postId",
          targetKey: "tagId",
        },
      },
    },
  })
  .register({ entity: "Tag", table: "tags" });
```

### Collection Types

| Type | Relationship | Creates | Deletes |
|------|-------------|---------|---------|
| `owned` | 1:N | `INSERT` into child table | `DELETE` from child table |
| `reference` | N:N | `INSERT` into junction table (ON CONFLICT DO NOTHING) | `DELETE` from junction table |

> **Warning:** Unlike Prisma, `reference` collections **always require** a `junction` config. Omitting it throws `MissingJunctionConfigError` at runtime.

## DrizzleToPersistence Mapper

Base class for persisting aggregates. Controls `onCreate` (required); `onUpdate` defaults to `DrizzleBatchExecutor`.

```typescript
import { DrizzleToPersistence, Transactional } from "@woltz/rich-domain-drizzle";
import { EntitySchemaRegistry } from "@woltz/rich-domain";

type DB = ReturnType<typeof getDb>;

export class UserToPersistenceMapper extends DrizzleToPersistence<User, DB> {
  protected readonly registry = new EntitySchemaRegistry()
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
          junction: { table: "posts_to_tags", sourceKey: "postId", targetKey: "tagId" },
        },
      },
    })
    .register({ entity: "Tag", table: "tags" });

  // tableMap must include ALL entities and junction tables used in registry
  protected readonly tableMap = new Map<string, any>([
    ["User", users],
    ["Post", posts],
    ["Tag", tags],
    ["posts_to_tags", postsToTags],  // junction table name → Drizzle table object
  ]);

  // Required: handle INSERT for new aggregate
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

  // Optional: override only if you need custom update logic.
  // Default delegates to DrizzleBatchExecutor automatically.
}
```

### `context` property

`this.context` returns the transaction client when inside a `@Transactional` / `uow.transaction`, otherwise the raw `db`. Always use `this.context` instead of `this.db`.

## DrizzleRepository

Base class for repositories. Provides CRUD and Criteria-based queries.

```typescript
import { DrizzleRepository, DrizzleUnitOfWork, SearchableField } from "@woltz/rich-domain-drizzle";
import { eq } from "drizzle-orm";

type DB = ReturnType<typeof getDb>;

export class DrizzleUserRepository
  extends DrizzleRepository<User, UserRecord, DB>
  implements UserRepository
{
  constructor(db: DB, uow: DrizzleUnitOfWork) {
    super({
      db,
      table: users,                                     // Drizzle table object
      toDomainMapper: new UserToDomainMapper(),
      toPersistenceMapper: new UserToPersistenceMapper(db, uow),
      uow,
    });
  }

  // Required: key in db.query (must match Drizzle schema export name)
  protected get model() {
    return "users";
  }

  // Required: columns used when criteria.search() is called
  protected getSearchableFields(): SearchableField<UserRecord>[] {
    return ["name", "email"];
  }

  // Optional: relations to eager-load via Drizzle relational query API
  protected getDefaultRelations() {
    return {
      posts: {
        with: { tags: { with: { tag: true } } },
      },
    };
  }

  // Custom method — use this.context for transaction-aware queries
  async findByEmail(email: string): Promise<User | null> {
    const record = await this.context.query.users.findFirst({
      where: eq(users.email, email),
      with: this.getDefaultRelations() as any,
    });
    if (!record) return null;
    const user = this.toDomainMapper.build(record as any);
    user.markAsClean();
    return user;
  }
}
```

### Built-in Methods

```typescript
find(criteria: Criteria<T>): Promise<PaginatedResult<T>>
findById(id: string): Promise<T | null>
findManyByIds(ids: string[]): Promise<T[]>
count(criteria?: Criteria<T>): Promise<number>
exists(id: string): Promise<boolean>
save(entity: T): Promise<void>       // calls toPersistenceMapper.build(), then markAsPersisted()
delete(entity: T): Promise<void>
deleteById(id: string): Promise<void>
transaction<T>(work: () => Promise<T>): Promise<T>
```

> `save()` automatically calls `entity.markAsPersisted()` after persisting.

## DrizzleBatchExecutor

Executes `AggregateChanges` in correct FK-safe order. Used internally by `DrizzleToPersistence.onUpdate` but can also be used directly.

```typescript
import { DrizzleBatchExecutor } from "@woltz/rich-domain-drizzle";

const executor = new DrizzleBatchExecutor({
  registry,
  db: context,   // use context (tx-aware), not raw db
  tableMap,
});

await executor.execute(changes);
```

Also available as a standalone function:

```typescript
import { executeBatch } from "@woltz/rich-domain-drizzle";

await executeBatch(context, changes, { registry, tableMap });
```

### Execution Order

1. **Deletes** — depth DESC (leaf → root)
   - `owned`: `DELETE FROM table WHERE id IN (...)`
   - `reference`: `DELETE FROM junction WHERE sourceKey = ? AND targetKey IN (...)`
2. **Creates** — depth ASC (root → leaf)
   - `owned`: `INSERT INTO table VALUES (...)`
   - `reference`: `INSERT INTO junction ON CONFLICT DO NOTHING`
3. **Updates** — any order, only changed fields

## Transactions

### @Transactional Decorator

```typescript
import { Transactional } from "@woltz/rich-domain-drizzle";

class CreateUserUseCase {
  constructor(
    private readonly userRepository: DrizzleUserRepository,
    private readonly uow: DrizzleUnitOfWork
  ) {}

  @Transactional()
  async execute(input: CreateUserInput): Promise<User> {
    const user = new User({ ... });
    await this.userRepository.save(user);
    return user;
    // auto-commits; auto-rolls back on throw
  }
}
```

UoW resolution order for `@Transactional()` (no argument):
1. `this.uow`
2. `this._uow`
3. First property that is a `DrizzleUnitOfWork` instance

Or pass explicitly: `@Transactional(myUow)`

### Manual Transaction

```typescript
await uow.transaction(async () => {
  await userRepository.save(user);
  await postRepository.save(post);
  // all or nothing
});
```

### Nested Transactions

Both `@Transactional` and `uow.transaction()` are idempotent — nested calls reuse the active context instead of creating a new transaction.

## Drizzle Schema Requirements

- All tables must have an `id` column (used by `DrizzleRepository` for queries).
- Relation types for the relational query API must be declared with `relations()`.
- Junction tables must export a table object and be included in `tableMap`.

```typescript
// schema.ts
export const postsToTags = pgTable(
  "posts_to_tags",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })]
);

// relations needed for db.query API
export const postsToTagsRelations = relations(postsToTags, ({ one }) => ({
  post: one(posts, { fields: [postsToTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postsToTags.tagId], references: [tags.id] }),
}));

// inferred type for mapper
export type UserRecord = typeof users.$inferSelect;
export type UserWithPosts = UserRecord & { posts: PostRecord[] };
```

## Criteria Support

Same API as Prisma. Top-level columns only — dot paths like `"posts.title"` are not supported.

```typescript
const result = await userRepository.find(
  Criteria.create<User>()
    .whereEquals("published", true)
    .orderByAsc("createdAt")
    .paginate(1, 20)
);
// result.data → User[]
// result.toJSON().meta → { page, limit, total, totalPages, hasNext, hasPrev }
```

## Error Reference

| Error | When thrown |
|-------|------------|
| `TableNotFoundError` | `tableMap` key not found for an entity or junction name |
| `MissingJunctionConfigError` | `reference` collection has no `junction` configured |
| `BatchOperationError` | DB error during a batch create, update, or delete |
| `NoRecordsAffectedError` | `delete()` / `deleteById()` matched 0 rows |
| `DrizzleAdapterError` | Unsupported Criteria operator, dot-field path, or column not found |

```typescript
import {
  TableNotFoundError,
  MissingJunctionConfigError,
  BatchOperationError,
  NoRecordsAffectedError,
  DrizzleAdapterError,
} from "@woltz/rich-domain-drizzle";
```

## Complete Example

```typescript
// infrastructure/database/schema.ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: boolean("published").notNull().default(false),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserRecord = typeof users.$inferSelect;
export type PostRecord = typeof posts.$inferSelect;

// infrastructure/database/mappers/user-to-domain.mapper.ts
export class UserToDomainMapper extends Mapper<UserWithPosts, User> {
  build(record: UserWithPosts): User {
    const user = new User({
      id: Id.from(record.id),
      email: record.email,
      name: record.name,
      posts: record.posts?.map((p) => new Post({
        id: Id.from(p.id),
        title: p.title,
        content: p.content,
        published: p.published,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })) ?? [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
    return user;
  }
}

// infrastructure/database/mappers/user-to-persistence.mapper.ts
export class UserToPersistenceMapper extends DrizzleToPersistence<User, DB> {
  protected readonly registry = new EntitySchemaRegistry()
    .register({
      entity: "User",
      table: "users",
      collections: { posts: { type: "owned", entity: "Post" } },
    })
    .register({
      entity: "Post",
      table: "posts",
      parentFk: { field: "authorId", parentEntity: "User" },
    });

  protected readonly tableMap = new Map([
    ["User", users],
    ["Post", posts],
  ]);

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
}

// infrastructure/database/repositories/drizzle-user.repository.ts
export class DrizzleUserRepository
  extends DrizzleRepository<User, UserRecord, DB>
  implements UserRepository
{
  constructor(db: DB, uow: DrizzleUnitOfWork) {
    super({
      db,
      table: users,
      toDomainMapper: new UserToDomainMapper(),
      toPersistenceMapper: new UserToPersistenceMapper(db, uow),
      uow,
    });
  }

  protected get model() { return "users"; }

  protected getSearchableFields(): SearchableField<UserRecord>[] {
    return ["name", "email"];
  }

  protected getDefaultRelations() {
    return { posts: true };
  }
}

// application/services/user.service.ts
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly uow: DrizzleUnitOfWork
  ) {}

  @Transactional()
  async create(input: CreateUserInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) throw new Error("Email already in use");

    const user = new User({
      email: input.email,
      name: input.name,
      posts: [],
    });

    await this.userRepository.save(user);
    return user;
  }

  @Transactional()
  async addPost(userId: string, title: string, content: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error("User not found");

    user.addPost(title, content);
    await this.userRepository.save(user);
  }
}
```
