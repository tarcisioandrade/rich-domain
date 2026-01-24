# @woltz/rich-domain-typeorm

TypeORM adapter for [@woltz/rich-domain](../rich-domain) - bringing Domain-Driven Design patterns to TypeORM with automatic change tracking and batch operations.

## Features

- 🔄 **Automatic Change Tracking** - Detects changes in aggregates and persists them automatically
- 📦 **Batch Operations** - Optimized bulk inserts, updates, and deletes
- 🔗 **Smart Relationship Handling** - Automatic management of owned (1:N) and reference (N:N) collections
- 🔒 **Transaction Support** - Full ACID compliance with `@Transactional()` decorator
- 🔍 **Case-Insensitive Search** - Built-in support for flexible search with configurable case sensitivity
- 📊 **Query Builder Integration** - Rich Criteria API with TypeORM QueryBuilder
- 🎯 **Type-Safe** - Full TypeScript support with generic types

## Installation

```bash
npm install @woltz/rich-domain-typeorm @woltz/rich-domain typeorm
```

## Quick Start

### 1. Setup DataSource and UnitOfWork

```typescript
import { DataSource } from "typeorm";
import { TypeORMUnitOfWork } from "@woltz/rich-domain-typeorm";

const dataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "user",
  password: "password",
  database: "mydb",
  entities: [UserEntity, PostEntity, TagEntity],
  synchronize: true,
});

await dataSource.initialize();
const uow = new TypeORMUnitOfWork(dataSource);
```

### 2. Define Your Domain Entity

```typescript
import { Aggregate, Id } from "@woltz/rich-domain";
import { z } from "zod";

const UserSchema = z.object({
  id: z.custom<Id>(),
  email: z.string().email(),
  name: z.string(),
  posts: z.array(z.instanceof(Post)),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export class User extends Aggregate<z.infer<typeof UserSchema>> {
  protected static validation = { schema: UserSchema };

  addPost(post: Post): void {
    this.props.posts.push(post);
  }

  // Getters...
}
```

### 3. Create TypeORM Entities

```typescript
import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";

@Entity("users")
export class UserEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column()
  email!: string;

  @Column()
  name!: string;

  @OneToMany(() => PostEntity, (post) => post.author)
  posts!: PostEntity[];

  @Column()
  createdAt!: Date;

  @Column()
  updatedAt!: Date;
}
```

### 4. Create Persistence Mapper

```typescript
import {
  TypeORMToPersistence,
  EntitySchemaRegistry,
} from "@woltz/rich-domain-typeorm";

export class UserToPersistenceMapper extends TypeORMToPersistence<User> {
  protected readonly registry = new EntitySchemaRegistry()
    .register({
      entity: "User",
      table: "users",
      collections: {
        posts: {
          type: "owned", // 1:N - Posts are owned by User
          entity: "Post",
        },
      },
    })
    .register({
      entity: "Post",
      table: "posts",
      fields: {
        content: "main_content", // Map domain field to DB column
      },
      parentFk: {
        field: "authorId",
        parentEntity: "User",
      },
    });

  protected readonly entityClasses = new Map<string, new () => any>([
    ["User", UserEntity],
    ["Post", PostEntity],
  ]);

  protected async onCreate(aggregate: User, em: EntityManager): Promise<void> {
    // Create root entity
    const entity = new UserEntity();
    entity.id = aggregate.id.value;
    entity.email = aggregate.email;
    entity.name = aggregate.name;
    entity.createdAt = aggregate.createdAt;
    entity.updatedAt = aggregate.updatedAt;
    await em.save(entity);

    // Create owned entities (Posts)
    for (const post of aggregate.posts) {
      const postEntity = new PostEntity();
      postEntity.id = post.id.value;
      postEntity.title = post.title;
      postEntity.mainContent = post.content;
      postEntity.authorId = aggregate.id.value;
      postEntity.createdAt = post.createdAt;
      postEntity.updatedAt = post.updatedAt;
      await em.save(postEntity);
    }
  }
}
```

### 5. Create Repository

```typescript
import { TypeORMRepository, SearchableField } from "@woltz/rich-domain-typeorm";

export class TypeORMUserRepository extends TypeORMRepository<User, UserEntity> {
  constructor(repo: Repository<UserEntity>, uow: TypeORMUnitOfWork) {
    super({
      typeormRepository: repo,
      toDomainMapper: new UserToDomainMapper(),
      toPersistenceMapper: new UserToPersistenceMapper(uow),
      uow,
    });
  }

  // Load posts by default
  protected getDefaultRelations(): string[] {
    return ["posts"];
  }

  // Enable case-insensitive search
  protected getSearchableFields(): SearchableField<UserEntity>[] {
    return [
      "name", // Case-insensitive by default
      "email", // Case-insensitive by default
      "posts.title", // Nested relation search
    ];
  }
}
```

### 6. Use in Your Service

```typescript
import { Transactional } from "@woltz/rich-domain-typeorm";

export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly uow: TypeORMUnitOfWork
  ) {}

  @Transactional() // Automatic transaction management
  async createUser(data: CreateUserInput): Promise<User> {
    const user = new User({
      id: new Id(),
      email: data.email,
      name: data.name,
      posts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.userRepo.save(user); // Automatic change tracking!
    return user;
  }

  @Transactional()
  async addPost(userId: string, postData: CreatePostInput): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error("User not found");

    const post = new Post({
      id: new Id(),
      title: postData.title,
      content: postData.content,
      authorId: userId,
      tags: [],
      published: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    user.addPost(post);
    await this.userRepo.save(user); // BatchExecutor handles the Post creation!
  }
}
```

## Advanced Features

### N:N Relationships with Junction Tables

For many-to-many relationships, configure the junction table in your registry:

```typescript
// Domain Entity
export class Post extends Entity<PostProps> {
  addTag(tag: Tag): void {
    this.props.tags.push(tag);
  }

  removeTag(tag: Tag): void {
    this.props.tags = this.props.tags.filter(t => !t.id.equals(tag.id));
  }
}

// TypeORM Entity
@Entity("posts")
export class PostEntity {
  @ManyToMany(() => TagEntity, tag => tag.posts)
  @JoinTable({
    name: "_PostToTag",
    joinColumn: { name: "A", referencedColumnName: "id" },
    inverseJoinColumn: { name: "B", referencedColumnName: "id" }
  })
  tags!: TagEntity[];
}

// Registry Configuration
protected readonly registry = new EntitySchemaRegistry().register({
  entity: "Post",
  table: "posts",
  collections: {
    tags: {
      type: "reference",  // N:N - Tags are referenced
      entity: "Tag",
      junction: {
        table: "_PostToTag",
        sourceKey: "A",  // Must match JoinTable column names!
        targetKey: "B"
      }
    }
  }
});
```

When you add or remove tags, the adapter automatically manages the junction table:

```typescript
const post = await postRepo.findById(postId);
post.addTag(new Tag({ id: new Id("promo") }));
await postRepo.save(post);
// → Automatically: INSERT INTO "_PostToTag" ("A", "B") VALUES (postId, 'promo')
```

### Case-Insensitive Search

Configure search fields with optional case sensitivity:

```typescript
protected getSearchableFields(): SearchableField<PostEntity>[] {
  return [
    'title',                                    // Case-insensitive (default)
    'mainContent',                              // Case-insensitive (default)
    { field: 'code', caseSensitive: true },     // Case-sensitive
    'author.name'                               // Nested relation (case-insensitive)
  ];
}
```

Usage with Criteria:

```typescript
const criteria = Criteria.create<Post>()
  .search("hello") // Searches in title, mainContent, and author.name (case-insensitive)
  .where("published", "eq", true)
  .orderBy("createdAt", "desc")
  .paginate(1, 20);

const posts = await postRepo.find(criteria);
// → SELECT * FROM posts
//    LEFT JOIN users ON posts.author_id = users.id
//    WHERE (LOWER(posts.title) LIKE LOWER('%hello%')
//           OR LOWER(posts.main_content) LIKE LOWER('%hello%')
//           OR LOWER(users.name) LIKE LOWER('%hello%'))
//    AND posts.published = true
//    ORDER BY posts.created_at DESC
//    LIMIT 20
```

### Transaction Management

The `@Transactional()` decorator provides automatic transaction handling:

```typescript
@Transactional()
async transferPosts(fromUserId: string, toUserId: string): Promise<void> {
  const fromUser = await this.userRepo.findById(fromUserId);
  const toUser = await this.userRepo.findById(toUserId);

  if (!fromUser || !toUser) throw new Error("User not found");

  // Move all posts from one user to another
  for (const post of fromUser.posts) {
    fromUser.removePost(post);
    toUser.addPost(post);
  }

  await this.userRepo.save(fromUser);
  await this.userRepo.save(toUser);

  // ✅ Both saves succeed → COMMIT
  // ❌ Any error → ROLLBACK (nothing persisted)
}
```

**Nested Transactions**: The decorator is idempotent - if already in a transaction, it reuses it:

```typescript
@Transactional()
async outer() {
  await this.methodA();  // ✅ Uses same transaction
  await this.methodB();  // ✅ Uses same transaction
}

@Transactional()
async methodA() {
  // This decorator detects existing transaction and reuses it
}

@Transactional()
async methodB() {
  // This decorator detects existing transaction and reuses it
}
```

## How It Works

### Change Tracking Flow

```
1. Load Aggregate from DB
   ├─ TypeORMRepository.findById()
   └─ Creates snapshot of current state

2. Modify Aggregate (Domain Logic)
   ├─ user.addPost(post)
   ├─ post.addTag(tag)
   └─ Proxy tracks all changes

3. Save Aggregate
   ├─ TypeORMRepository.save(user)
   ├─ Detects changes via getChanges()
   └─ Routes to appropriate handler:
       ├─ New aggregate → onCreate()
       └─ Existing → BatchExecutor

4. BatchExecutor Processes Changes
   ├─ Deletes (leaf → root, depth DESC)
   ├─ Creates (root → leaf, depth ASC)
   └─ Updates (any order)
```

### Collection Types

| Type          | Description                        | Example        | Behavior                        |
| ------------- | ---------------------------------- | -------------- | ------------------------------- |
| **owned**     | Parent owns children (1:N)         | User has Posts | Create/Delete entities          |
| **reference** | References existing entities (N:N) | Post has Tags  | Connect/Disconnect via junction |

### onCreate vs BatchExecutor

For **new aggregates** (`isNew() === true`):

- `onCreate()` is called to create the root entity
- You must manually create all child entities in `onCreate()`
- BatchExecutor is NOT used for initial creation

For **existing aggregates** with changes:

- `onCreate()` is NOT called
- BatchExecutor automatically handles all changes
- Optimized bulk operations

## Best Practices

### ✅ DO

- Use `@Transactional()` on service methods that modify data
- Configure `getDefaultRelations()` to eagerly load related entities
- Use `SearchableField<TEntity>[]` for type-safe search configuration
- Map field names in registry when domain ≠ database names
- Use `owned` for 1:N relationships where parent controls lifecycle
- Use `reference` for N:N relationships with independent entities

### ❌ DON'T

- Don't add `@Transactional()` to mapper methods (redundant)
- Don't forget to configure junction table columns correctly (must match `@JoinTable`)
- Don't use BatchExecutor directly in `onCreate()` (it won't work)
- Don't create entities manually in updates (let BatchExecutor handle it)

## API Reference

### TypeORMRepository

```typescript
class TypeORMRepository<TDomain, TEntity> extends Repository<TDomain> {
  // Query methods
  async findById(id: string): Promise<TDomain | null>;
  async find(criteria?: Criteria<TDomain>): Promise<PaginatedResult<TDomain>>;
  async findOne(criteria: Criteria<TDomain>): Promise<TDomain | null>;
  async count(criteria?: Criteria<TDomain>): Promise<number>;
  async exists(id: string): Promise<boolean>;
  async findAll(): Promise<TDomain[]>;

  // Persistence methods
  async save(aggregate: TDomain): Promise<void>;
  async delete(aggregate: TDomain): Promise<void>;
  async deleteById(id: string): Promise<void>;

  // Configuration hooks
  protected getDefaultRelations(): string[];
  protected getSearchableFields(): SearchableField<TEntity>[];
}
```

### EntitySchemaRegistry

```typescript
interface EntitySchemaRegistry {
  register(config: {
    entity: string;
    table?: string;
    fields?: Record<string, string>;
    collections?: Record<
      string,
      {
        type: "owned" | "reference";
        entity: string;
        junction?: {
          table: string;
          sourceKey: string;
          targetKey: string;
        };
      }
    >;
    parentFk?: {
      field: string;
      parentEntity: string;
    };
  }): EntitySchemaRegistry;
}
```

### SearchableFieldConfig

```typescript
type SearchableField<T> =
  | keyof T
  | `${string}.${string}` // Nested fields
  | {
      field: string;
      caseSensitive?: boolean; // Default: false
    };
```

## Examples

See the [fastify-with-typeorm example](../../examples/backend/fastify-with-typeorm) for a complete working application demonstrating:

- ✅ User aggregate with Posts (1:N owned)
- ✅ Post with Tags (N:N reference via junction table)
- ✅ Case-insensitive search
- ✅ Transaction management
- ✅ CRUD operations
- ✅ Domain events

## License

MIT
