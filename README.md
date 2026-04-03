<div align="center">

<img width="1463" height="246" alt="Rich Domain" src="https://github.com/user-attachments/assets/8b848f42-307f-41a2-9fc3-8074348d3f83" />

**Domain-Driven Design toolkit for TypeScript.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.12-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-blue)](https://www.typescriptlang.org/)

[Documentation](https://woltz.mintlify.app) · [Quick Start](https://woltz.mintlify.app/quickstart/default) · [Examples](./examples)

</div>

---

## Packages

| Package                                                                  | Version                                                                                                                                          | Description                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [`@woltz/rich-domain`](./packages/rich-domain)                           | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain.svg?label=)](https://www.npmjs.com/package/@woltz/rich-domain)                           | Core library — Entities, Aggregates, Value Objects, Criteria, Change Tracking, Domain Events |
| [`@woltz/rich-domain-prisma`](./packages/rich-domain-prisma)             | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-prisma.svg?label=)](https://www.npmjs.com/package/@woltz/rich-domain-prisma)             | Prisma adapter — Unit of Work, batch operations, `@Transactional` decorator                  |
| [`@woltz/rich-domain-typeorm`](./packages/rich-domain-typeorm)           | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-typeorm.svg?label=)](https://www.npmjs.com/package/@woltz/rich-domain-typeorm)           | TypeORM adapter — repository, transactions, batch executor                                   |
| [`@woltz/rich-domain-export`](./packages/rich-domain-export)             | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-export.svg?label=)](https://www.npmjs.com/package/@woltz/rich-domain-export)             | Multi-format data export (CSV, JSON, JSONL) with streaming support                           |
| [`@woltz/rich-domain-criteria-zod`](./packages/rich-domain-criteria-zod) | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-criteria-zod.svg?label=)](https://www.npmjs.com/package/@woltz/rich-domain-criteria-zod) | Zod schemas for validating Criteria query params from HTTP requests                          |

## Quick Start

### Install

```bash
npm install @woltz/rich-domain zod
```

> Add an ORM adapter if needed: `@woltz/rich-domain-prisma` or `@woltz/rich-domain-typeorm`.

### Define a Value Object

```typescript
import { ValueObject, VOValidation } from "@woltz/rich-domain";
import { z } from "zod";

const emailSchema = z.string().email();


class Email extends ValueObject<string> {
  protected static validation<VOValidation<string>> = { schema: emailSchema };

  getDomain(): string {
    return this.value.split("@")[1];
  }
}

const email = new Email("john@example.com");
console.log(email.value);       // "john@example.com"
console.log(email.getDomain()); // "example.com"
```

### Define an Aggregate with Validation

```typescript
import {
  Aggregate,
  Entity,
  Id,
  type EntityValidation,
  type EntityHooks,
} from "@woltz/rich-domain";
import { z } from "zod";

// Child Entity
const PostSchema = z.object({
  id: z.custom<Id>(),
  title: z.string().min(1),
  content: z.string(),
  published: z.boolean(),
});
type PostProps = z.infer<typeof PostSchema>;

class Post extends Entity<PostProps> {
  protected static validation: EntityValidation<PostProps> = {
    schema: PostSchema,
  };

  publish() {
    this.props.published = true;
  }
  get title() {
    return this.props.title;
  }
  get content() {
    return this.props.content;
  }
}

// Aggregate Root
const UserSchema = z.object({
  id: z.custom<Id>(),
  email: z.custom<Email>(),
  name: z.string().min(2),
  posts: z.array(z.instanceof(Post)),
  createdAt: z.date(),
});
type UserProps = z.infer<typeof UserSchema>;

class User extends Aggregate<UserProps, "createdAt"> {
  protected static validation: EntityValidation<UserProps> = {
    schema: UserSchema,
  };

  protected static hooks: EntityHooks<UserProps, User> = {
    onBeforeCreate: (props) => {
      if (!props.createdAt) props.createdAt = new Date();
    },
  };

  // Recommended pattern for type-safe change tracking
  getTypedChanges() {
    interface Entities {
      Post: Post;
    }
    return this.getChanges<Entities>();
  }

  addPost(title: string, content: string): void {
    this.props.posts.push(new Post({ title, content, published: false }));
  }

  get email() {
    return this.props.email.value;
  }
  get posts() {
    return this.props.posts;
  }
}
```

### Query with Type-Safe Criteria

```typescript
import { Criteria } from "@woltz/rich-domain";

const criteria = Criteria.create<User>()
  .where("status", "equals", "active")
  .whereContains("email", "@company.com")
  .orderBy("createdAt", "desc")
  .paginate(1, 20);

const result = await userRepository.find(criteria);
```

### Automatic Change Tracking

```typescript
const user = await userRepository.findById(userId);
user.addPost("Hello", "World");
user.posts[0].publish();

const changes = user.getTypedChanges();
// changes.for("Post").creates  → [Post]
// changes.for("Post").updates  → [{ entity: Post, changed: { published: { from: false, to: true } } }]

await userRepository.save(user); // Only the diff hits the database
user.markAsClean();
```

## Domain Events

Rich Domain provides the `IDomainEventBus` interface — you bring the implementation (in-memory, BullMQ, Kafka, etc.).

```typescript
import { DomainEvent, type IDomainEventBus } from "@woltz/rich-domain";

class OrderConfirmedEvent extends DomainEvent<{
  orderId: string;
  total: number;
}> {}

// Inside a use case
const order = Order.create(data);
await orderRepository.save(order);
await order.dispatchAll(eventBus); // Publishes and clears events automatically
```

## Development

**Prerequisites:** Node.js ≥ 22.12.0

```bash
git clone https://github.com/tarcisioandrade/rich-domain.git
cd rich-domain
npm install
npm run build
npm test
```

**Workspace commands:**

```bash
npm run build --workspace=@woltz/rich-domain    # Build a single package
npm run test --workspace=@woltz/rich-domain     # Test a single package
npm run check                                   # Type-check all packages
npm run lint                                    # Lint all packages
npm run clean                                   # Clean all build artifacts
```

## Documentation

Visit **[woltz.mintlify.app](https://woltz.mintlify.app)** for the full documentation covering core concepts, validation, criteria queries, repository patterns, ORM integrations, React components, and CLI reference.

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit with [conventional commits](https://www.conventionalcommits.org/) (`git commit -m 'feat: add something'`)
4. Run `npm run check && npm test && npm format` before pushing
5. Open a Pull Request

## License

[MIT](./LICENSE) © [Tarcisio Andrade](https://github.com/tarcisioandrade)
