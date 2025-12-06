# @woltz/rich-domain-cli

CLI tools for [@woltz/rich-domain](https://github.com/tarcisioandrade/rich-domain). Generate domain entities, aggregates, repositories, and mappers from your Prisma schema.

## Installation

```bash
npm install -D @woltz/rich-domain-cli

# Or run directly with npx
npx @woltz/rich-domain-cli generate
```

## Features

- 🔍 **Prisma Schema Introspection** - Reads your Prisma schema and generates domain files
- 🏗️ **Smart Classification** - Automatically determines Aggregates vs Entities
- 📦 **Dependency Resolution** - Generates files in correct order (topological sort)
- ✨ **Full Stack Generation** - Creates schemas, entities, repositories, and mappers
- 🔄 **Zod Integration** - Generates Zod schemas from Prisma types

## Quick Start

```bash
# Generate from default prisma/schema.prisma
npx rich-domain generate

# Specify schema path
npx rich-domain generate --schema prisma/schema.prisma

# Generate to custom directory
npx rich-domain generate --output src/domain

# Generate only specific models
npx rich-domain generate --models User,Post,Comment

# Preview without writing files
npx rich-domain generate --dry-run
```

## Generated Structure

For a Prisma schema with `User`, `Post`, and `Comment` models:

```
src/domain/
├── shared/
│   └── enums.ts              # All Prisma enums
├── user/
│   ├── index.ts
│   ├── user.schema.ts        # Zod schema
│   ├── user.aggregate.ts     # Aggregate class
│   ├── user.repository.ts    # Repository
│   ├── user-to-domain.mapper.ts
│   └── user-to-persistence.mapper.ts
├── post/
│   ├── index.ts
│   ├── post.schema.ts
│   ├── post.aggregate.ts
│   ├── post.repository.ts
│   ├── post-to-domain.mapper.ts
│   └── post-to-persistence.mapper.ts
└── comment/
    ├── index.ts
    ├── comment.schema.ts
    └── comment.entity.ts     # Entity (not aggregate root)
```

## Command Reference

### `generate`

Generate domain files from Prisma schema.

```bash
rich-domain generate [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --schema <path>` | Path to Prisma schema file | `prisma/schema.prisma` |
| `-o, --output <path>` | Output directory | `src/domain` |
| `-v, --validation <type>` | Validation library (`zod`, `valibot`, `arktype`) | `zod` |
| `-m, --models <names>` | Comma-separated list of models to generate | All models |
| `--dry-run` | Preview without writing files | `false` |
| `-f, --force` | Skip confirmation prompts | `false` |

## Example Output

### From Prisma Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
```

### Generated Schema

```typescript
// user.schema.ts
import { z } from "zod";
import { Id } from "@woltz/rich-domain";
import { Role } from "../shared/enums.js";
import { Post } from "../post/index.js";

export const userSchema = z.object({
  id: z.instanceof(Id),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.nativeEnum(Role).default(Role.USER),
  createdAt: z.date(),
  updatedAt: z.date(),
  posts: z.array(z.instanceof(Post)),
});
```

### Generated Aggregate

```typescript
// user.aggregate.ts
import { Aggregate, Id } from "@woltz/rich-domain";
import { z } from "zod";
import { userSchema } from "./user.schema.js";
import { Role } from "../shared/enums.js";
import { Post } from "../post/index.js";

type UserProps = z.infer<typeof userSchema>;

export class User extends Aggregate<UserProps> {
  protected static validation = {
    schema: userSchema,
  };

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get role(): Role {
    return this.props.role;
  }

  get posts(): Post[] {
    return this.props.posts;
  }

  static create(props: Pick<UserProps, "email" | "name"> & Partial<Pick<UserProps, "role">>): User {
    return new User({
      ...props,
      id: new Id(),
      role: props.role ?? Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      posts: [],
    });
  }

  updateEmail(email: string): void {
    this.props.email = email;
    this.props.updatedAt = new Date();
  }

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  addPost(post: Post): void {
    this.props.posts.push(post);
  }

  removePost(postId: Id): void {
    this.props.posts = this.props.posts.filter(
      (item) => !item.id.equals(postId)
    );
  }
}
```

## Aggregate vs Entity Classification

The CLI automatically classifies models:

- **Aggregate**: Models that are referenced by others (have "children") or have list relations
- **Entity**: Models that only reference others without being referenced

Only Aggregates get repository and mapper files generated.

## Circular Dependencies

If circular dependencies are detected, the CLI will:

1. Warn you about the cycles
2. Still generate files (with forward references)
3. Suggest refactoring to break the cycle

## Requirements

- Node.js >= 18
- Prisma schema file
- `@woltz/rich-domain` and `@woltz/rich-domain-prisma` installed

## License

MIT
