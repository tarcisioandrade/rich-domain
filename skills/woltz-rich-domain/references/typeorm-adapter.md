# TypeORM Adapter

Integration with TypeORM for @woltz/rich-domain.

## Installation

```bash
npm install @woltz/rich-domain @woltz/rich-domain-typeorm typeorm
```

## Setup

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

## TypeORM Entity Definitions

```typescript
import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from "typeorm";

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
}

@Entity("posts")
export class PostEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ name: "main_content" })
  mainContent!: string;

  @Column()
  published!: boolean;

  @Column()
  authorId!: string;

  @ManyToOne(() => UserEntity, (user) => user.posts)
  author!: UserEntity;

  @ManyToMany(() => TagEntity)
  @JoinTable({
    name: "_PostToTag",
    joinColumn: { name: "A", referencedColumnName: "id" },
    inverseJoinColumn: { name: "B", referencedColumnName: "id" },
  })
  tags!: TagEntity[];
}

@Entity("tags")
export class TagEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column()
  name!: string;
}
```

## TypeORMRepository

```typescript
import { TypeORMRepository, SearchableField } from "@woltz/rich-domain-typeorm";
import { Repository } from "typeorm";

class UserRepository extends TypeORMRepository<User, UserEntity> {
  constructor(dataSource: DataSource, uow: TypeORMUnitOfWork) {
    super({
      typeormRepository: dataSource.getRepository(UserEntity),
      toDomainMapper: new UserToDomainMapper(),
      toPersistenceMapper: new UserToPersistenceMapper(uow),
      uow,
    });
  }

  // Default relations to load
  protected getDefaultRelations(): string[] {
    return ["posts", "posts.tags"];
  }

  // Searchable fields for Criteria.search()
  protected getSearchableFields(): SearchableField<UserEntity>[] {
    return [
      "name", // case-insensitive (default)
      "email", // case-insensitive
      { field: "code", caseSensitive: true }, // case-sensitive
      "posts.title", // nested relation
    ];
  }

  // Custom methods
  async findByEmail(email: string): Promise<User | null> {
    const data = await this.typeormRepository.findOne({
      where: { email },
      relations: this.getDefaultRelations(),
    });
    return data ? this.toDomainMapper.build(data) : null;
  }
}
```

### Available Methods

```typescript
interface TypeORMRepository<TDomain, TEntity> {
  find(criteria?: Criteria<TDomain>): Promise<PaginatedResult<TDomain>>;
  findById(id: string): Promise<TDomain | null>;
  findOne(criteria: Criteria<TDomain>): Promise<TDomain | null>;
  findAll(): Promise<TDomain[]>;
  count(criteria?: Criteria<TDomain>): Promise<number>;
  exists(id: string): Promise<boolean>;
  save(aggregate: TDomain): Promise<void>;
  delete(aggregate: TDomain): Promise<void>;
  deleteById(id: string): Promise<void>;
}
```

## TypeORMToPersistence Mapper

```typescript
import {
  TypeORMToPersistence,
  EntitySchemaRegistry,
} from "@woltz/rich-domain-typeorm";
import { EntityManager } from "typeorm";

class UserToPersistenceMapper extends TypeORMToPersistence<User> {
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
      fields: { content: "mainContent" },
      parentFk: { field: "authorId", parentEntity: "User" },
      collections: {
        tags: {
          type: "reference",
          entity: "Tag",
          junction: {
            table: "_PostToTag",
            sourceKey: "A",
            targetKey: "B",
          },
        },
      },
    })
    .register({
      entity: "Tag",
      table: "tags",
    });

  protected readonly entityClasses = new Map<string, new () => any>([
    ["User", UserEntity],
    ["Post", PostEntity],
    ["Tag", TagEntity],
  ]);

  // Handle new aggregate creation
  protected async onCreate(user: User, em: EntityManager): Promise<void> {
    const userEntity = new UserEntity();
    userEntity.id = user.id.value;
    userEntity.email = user.email;
    userEntity.name = user.name;
    userEntity.createdAt = user.createdAt;
    await em.save(userEntity);

    for (const post of user.posts) {
      const postEntity = new PostEntity();
      postEntity.id = post.id.value;
      postEntity.title = post.title;
      postEntity.mainContent = post.content;
      postEntity.published = post.published;
      postEntity.authorId = user.id.value;
      await em.save(postEntity);
    }
  }
}
```

## Searchable Fields

Configure case sensitivity for search:

```typescript
protected getSearchableFields(): SearchableField<PostEntity>[] {
  return [
    "title",                                    // Case-insensitive (default)
    "mainContent",                              // Case-insensitive
    { field: "code", caseSensitive: true },     // Case-sensitive
    "author.name",                              // Nested relation
  ];
}
```

Usage with Criteria:

```typescript
const criteria = Criteria.create<Post>()
  .search("hello") // Searches title, mainContent, author.name
  .where("published", "equals", true)
  .orderBy("createdAt", "desc");

const posts = await postRepository.find(criteria);
// SELECT * FROM posts
// LEFT JOIN users ON posts.author_id = users.id
// WHERE (LOWER(title) LIKE '%hello%' OR LOWER(main_content) LIKE '%hello%' OR LOWER(users.name) LIKE '%hello%')
// AND published = true
```

## Transactions

### @Transactional Decorator

```typescript
import { Transactional } from "@woltz/rich-domain-typeorm";

class TransferService {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly uow: TypeORMUnitOfWork
  ) {}

  @Transactional()
  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    const from = await this.accountRepo.findById(fromId);
    const to = await this.accountRepo.findById(toId);

    if (!from || !to) throw new Error("Account not found");

    from.withdraw(amount);
    to.deposit(amount);

    await this.accountRepo.save(from);
    await this.accountRepo.save(to);
    // All or nothing
  }
}
```

### Manual Transaction

```typescript
await uow.transaction(async () => {
  await userRepository.save(user);
  await orderRepository.save(order);
});
```

## N:N Relationships

Configure junction table in registry:

```typescript
// TypeORM Entity
@Entity("posts")
export class PostEntity {
  @ManyToMany(() => TagEntity)
  @JoinTable({
    name: "_PostToTag",
    joinColumn: { name: "A" },
    inverseJoinColumn: { name: "B" },
  })
  tags!: TagEntity[];
}

// Schema Registry
.register({
  entity: "Post",
  table: "posts",
  collections: {
    tags: {
      type: "reference",
      entity: "Tag",
      junction: {
        table: "_PostToTag",  // Must match JoinTable name
        sourceKey: "A",       // Must match joinColumn name
        targetKey: "B",       // Must match inverseJoinColumn name
      },
    },
  },
})
```

Usage in domain:

```typescript
const post = await postRepository.findById(postId);
post.addTag(new Tag({ name: "featured" }));
await postRepository.save(post);
// → INSERT INTO "_PostToTag" ("A", "B") VALUES (postId, tagId)
```

## Domain Mapper (Persistence → Domain)

```typescript
import { Mapper, Id } from "@woltz/rich-domain";

class UserToDomainMapper extends Mapper<UserEntity, User> {
  build(entity: UserEntity): User {
    return new User({
      id: Id.from(entity.id),
      email: entity.email,
      name: entity.name,
      posts:
        entity.posts?.map(
          (p) =>
            new Post({
              id: Id.from(p.id),
              title: p.title,
              content: p.mainContent,
              published: p.published,
              tags:
                p.tags?.map(
                  (t) =>
                    new Tag({
                      id: Id.from(t.id),
                      name: t.name,
                    })
                ) ?? [],
            })
        ) ?? [],
      createdAt: entity.createdAt,
    });
  }
}
```

## Collection Types

| Type        | Relationship | Behavior                              |
| ----------- | ------------ | ------------------------------------- |
| `owned`     | 1:N          | Creates/deletes child entities        |
| `reference` | N:N          | Connect/disconnect via junction table |

## Change Tracking Flow

```
1. Load Aggregate
   └─ TypeORMRepository.findById() → Creates snapshot

2. Modify Aggregate
   ├─ user.addPost(post)
   ├─ post.addTag(tag)
   └─ Proxy tracks changes

3. Save Aggregate
   ├─ TypeORMRepository.save(user)
   ├─ Detects changes via getChanges()
   └─ Routes to:
       ├─ New → onCreate()
       └─ Existing → BatchExecutor

4. BatchExecutor
   ├─ Deletes (leaf → root)
   ├─ Creates (root → leaf)
   └─ Updates (any order)
```

## Best Practices

1. **Use getDefaultRelations()** - Eagerly load needed relations
2. **Match JoinTable config** - Junction must match exactly
3. **entityClasses required** - Map all entities for instantiation
4. **onCreate for new aggregates** - Handle full creation manually
5. **BatchExecutor for updates** - Handles changes automatically
