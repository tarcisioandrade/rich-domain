# @woltz/rich-domain

A TypeScript library for Domain-Driven Design with Standard Schema validation, automatic change tracking, and enterprise-ready repositories.

[![npm version](https://img.shields.io/npm/v/@woltz/rich-domain.svg)](https://www.npmjs.com/package/@woltz/rich-domain)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Type-Safe DDD Building Blocks** - Entities, Aggregates, Value Objects with full TypeScript support
- ✅ **Validation Agnostic** - Works with Zod, Valibot, ArkType, or any Standard Schema compatible library
- 🔄 **Automatic Change Tracking** - Track changes across nested entities and collections without boilerplate
- 🗄️ **ORM Independent** - Use with Prisma, TypeORM, Drizzle, or any persistence layer
- 🔍 **Rich Query API** - Type-safe Criteria pattern with fluent API for complex queries
- 📦 **Repository Pattern** - Abstract your persistence layer with built-in pagination and filtering
- 🎭 **Domain Events** - Built-in event system for cross-aggregate communication
- 🔐 **Lifecycle Hooks** - onCreate, onBeforeUpdate, and business rule validation
- 🪝 **React Integration** - Ready-to-use hooks and components via [@woltz/react-rich-domain](https://www.npmjs.com/package/@woltz/react-rich-domain)

## Installation

```bash
npm install @woltz/rich-domain

# With your preferred validation library
npm install zod # or valibot, arktype
```

## Quick Start

### 1. Define Your Domain Entities

```typescript
import { Aggregate, Entity, Id } from "@woltz/rich-domain";
import { z } from "zod";

// Value Object
class Email extends ValueObject<string> {
  protected static validation = {
    schema: z.string().email("Invalid email format"),
  };

  getDomain(): string {
    return this.value.split("@")[1];
  }
}

// Entity (child of Aggregate)
const PostSchema = z.object({
  id: z.custom<Id>(),
  title: z.string().min(3),
  content: z.string(),
  published: z.boolean(),
  createdAt: z.date(),
});

class Post extends Entity<z.infer<typeof PostSchema>> {
  protected static validation = { schema: PostSchema };

  publish(): void {
    this.props.published = true;
  }

  get title() {
    return this.props.title;
  }
}

// Aggregate Root
const UserSchema = z.object({
  id: z.custom<Id>(),
  email: z.custom<Email>(),
  name: z.string(),
  posts: z.array(z.instanceof(Post)),
  createdAt: z.date(),
  updatedAt: z.date(),
});

class User extends Aggregate<z.infer<typeof UserSchema>> {
  protected static validation = { schema: UserSchema };

  addPost(title: string, content: string): void {
    const post = new Post({
      title,
      content,
      published: false,
      createdAt: new Date(),
    });
    this.props.posts.push(post);
  }

  get email() {
    return this.props.email.value;
  }

  get posts() {
    return this.props.posts;
  }
}
```

### 2. Automatic Change Tracking

Changes are tracked automatically - no manual tracking needed:

```typescript
// Load existing user
const user = new User({
  id: Id.from("user-123"),
  email: new Email("john@example.com"),
  name: "John Doe",
  posts: [
    new Post({
      id: Id.from("post-1"),
      title: "First Post",
      content: "Content here",
      published: false,
      createdAt: new Date(),
    }),
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Make changes
user.addPost("Second Post", "More content"); // Create
user.posts[0].publish(); // Update
user.posts.splice(0, 1); // Delete

// Get all changes automatically organized
const changes = user.getChanges();

console.log(changes.hasCreates()); // true
console.log(changes.hasUpdates()); // true
console.log(changes.hasDeletes()); // true

// Changes are organized by depth for proper FK handling
const batch = changes.toBatchOperations();
// {
//   deletes: [{ entity: "Post", depth: 1, ids: ["post-1"] }],
//   creates: [{ entity: "Post", depth: 1, items: [...] }],
//   updates: [{ entity: "Post", depth: 1, items: [...] }]
// }
```

### 3. Type-Safe Queries with Criteria

Build complex queries with full type safety:

```typescript
import { Criteria } from "@woltz/rich-domain";

// Simple query
const activePosts = Criteria.create<Post>()
  .where("published", "equals", true)
  .orderBy("createdAt", "desc")
  .limit(10);

// Complex query with multiple filters
const criteria = Criteria.create<User>()
  .where("name", "contains", "John")
  .where("email", "startsWith", "john")
  .where("createdAt", "greaterThan", new Date("2024-01-01"))
  .orderBy("name", "asc")
  .paginate(1, 20);

// Use with repository
const result = await userRepository.find(criteria);
// result: PaginatedResult<User>

console.log(result.data); // User[]
console.log(result.meta); // { page: 1, pageSize: 20, total: 100, totalPages: 5 }
```

### 4. Repository Pattern

Abstract your persistence layer:

```typescript
import { IRepository, Criteria } from "@woltz/rich-domain";

interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findActiveUsers(): Promise<User[]>;
}

class UserRepository implements IUserRepository {
  async save(user: User): Promise<void> {
    // Your persistence logic
    const changes = user.getChanges();

    // Handle deletes (deepest first)
    for (const deletion of changes.toBatchOperations().deletes) {
      // Delete by entity and IDs
    }

    // Handle creates (root first)
    for (const creation of changes.toBatchOperations().creates) {
      // Create new entities
    }

    // Handle updates
    for (const update of changes.toBatchOperations().updates) {
      // Update only changed fields
    }
  }

  async findById(id: string): Promise<User | null> {
    // Your query logic
  }

  async find(criteria: Criteria<User>): Promise<PaginatedResult<User>> {
    // Transform criteria to your ORM query
    const filters = criteria.getFilters();
    const ordering = criteria.getOrdering();
    const pagination = criteria.getPagination();

    // Execute query and return paginated result
  }

  async findByEmail(email: string): Promise<User | null> {
    const criteria = Criteria.create<User>().where("email", "equals", email);

    const result = await this.find(criteria);
    return result.data[0] ?? null;
  }
}
```

## Advanced Features

### Lifecycle Hooks

Add validation and side effects at key points:

```typescript
class Product extends Aggregate<ProductProps> {
  protected static validation = {
    schema: ProductSchema,
  };

  protected static hooks = {
    onBeforeCreate: (props) => {
      // Set default values before validation
      if (!props.createdAt) {
        props.createdAt = new Date();
      }
    },

    onCreate: (entity) => {
      console.log(`Product created: ${entity.name}`);
    },

    onBeforeUpdate: (entity, snapshot) => {
      // Prevent price changes on inactive products
      if (snapshot.status === "inactive" && entity.price !== snapshot.price) {
        return false; // Reject the change
      }
      return true;
    },

    rules: (entity) => {
      if (entity.price > 1000 && entity.stock === 0) {
        entity.addValidationIssue(
          "stock",
          "Premium products must have stock available"
        );
        // Or use throwValidationError() for fail-fast
      }
    },
  };
}
```

With `throwOnError: false`, use `entity.addValidationIssue(path, message)` in `rules` and read `entity.validationErrors?.getFormattedErrors()` for `{ path, message }[]` field errors. By default (`persistInvalidMutations: true`), updates apply even when invalid (dirty / form mode). Set `persistInvalidMutations: false` to freeze the entity and revert failed updates while errors exist.

### Optional Input Properties

Make properties optional at construction but required in the entity:

```typescript
const userSchema = z.object({
  id: z.custom<Id>(),
  email: z.string().email(),
  password: z.string().min(8), // Required in entity
  createdAt: z.date(), // Required in entity
});

type UserProps = z.infer<typeof userSchema>;

// Second generic makes 'password' and 'createdAt' optional at input
class User extends Aggregate<UserProps, "password" | "createdAt"> {
  protected static validation = { schema: userSchema };

  protected static hooks = {
    onBeforeCreate: (props) => {
      // Generate values before validation
      if (!props.password) {
        props.password = generateEncryptedPassword();
      }
      if (!props.createdAt) {
        props.createdAt = new Date();
      }
    },
  };

  get email() {
    return this.props.email;
  }
}

// ✅ Works without password and createdAt
const user = new User({
  email: "user@example.com",
});

// ✅ Also works with explicit values
const customUser = new User({
  email: "user@example.com",
  password: "custom-pass-12345678",
});
```

### Domain Events

Communicate across aggregate boundaries:

```typescript
import { DomainEvent } from "@woltz/rich-domain";

class OrderConfirmedEvent extends DomainEvent {
  constructor(
    aggregateId: Id,
    public readonly customerId: string,
    public readonly total: number
  ) {
    super(aggregateId);
  }

  protected getPayload() {
    return { customerId: this.customerId, total: this.total };
  }
}

class Order extends Aggregate<OrderProps> {
  confirm(): void {
    if (this.props.items.length === 0) {
      throw new DomainError("Cannot confirm empty order");
    }

    this.props.status = "confirmed";

    // Emit event
    this.addDomainEvent(
      new OrderConfirmedEvent(this.id, this.customerId, this.total)
    );
  }
}

// After saving
await orderRepository.save(order);
await order.dispatchAll(eventBus);
order.clearEvents();
```

### Value Objects

Immutable wrappers for primitive values with domain behavior:

```typescript
import { ValueObject, VOHooks, throwValidationError } from "@woltz/rich-domain";

class Price extends ValueObject<number> {
  protected static validation = {
    schema: z.number().positive("Price must be positive"),
  };

  protected static hooks: VOHooks<number, Price> = {
    rules: (price) => {
      if (price.value > 1000000) {
        throwValidationError("value", "Price cannot exceed 1,000,000");
      }
    },
  };

  addTax(taxRate: number): Price {
    return this.clone(this.value * (1 + taxRate));
  }

  discount(percentage: number): Price {
    return this.clone(this.value * (1 - percentage / 100));
  }

  format(currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(this.value);
  }
}

const price = new Price(99.99);
const withTax = price.addTax(0.08);
const discounted = price.discount(10);

console.log(price.format()); // "$99.99"
console.log(withTax.format()); // "$107.99"
console.log(discounted.format()); // "$89.99"
```

## Integration with ORMs

Rich Domain provides official adapters for popular ORMs:

### Prisma

```bash
npm install @woltz/rich-domain-prisma
```

```typescript
import {
  PrismaRepository,
  PrismaToPersistence,
} from "@woltz/rich-domain-prisma";

class UserToPersistence extends PrismaToPersistence<User> {
  protected readonly registry = schemaRegistry;

  protected async onCreate(user: User): Promise<void> {
    await this.context.user.create({
      data: {
        id: user.id.value,
        email: user.email,
        name: user.name,
      },
    });
  }

  protected async onUpdate(
    changes: AggregateChanges,
    user: User
  ): Promise<void> {
    // Automatic batch operations handling
  }
}
```

### TypeORM

```bash
npm install @woltz/rich-domain-typeorm
```

```typescript
import { TypeORMRepository } from "@woltz/rich-domain-typeorm";

class UserRepository extends TypeORMRepository<User, UserEntity> {
  // Automatic change tracking and batch operations
}
```

## CLI Tool

Bootstrap projects and generate domain code:

```bash
npm install -g @woltz/rich-domain-cli

# Initialize new project
rich-domain init my-app --template fullstack

# Generate domain from Prisma schema
rich-domain generate --schema prisma/schema.prisma

# Add entity manually
rich-domain add User name:string email:string --with-repo
```

## API Reference

### Core Classes

#### `Id`

Unique identifier for entities:

```typescript
const id = Id.create(); // Generate new UUID
const existingId = Id.from("uuid-string"); // From existing value

console.log(id.value); // string
console.log(id.isNew()); // boolean
console.log(id.equals(otherId)); // boolean
```

#### `Entity<T>`

Base class for entities:

```typescript
abstract class Entity<T extends { id: Id }> {
  get id(): Id;
  isNew(): boolean;
  equals(other: Entity<T>): boolean;
  toJSON(): object;
}
```

#### `Aggregate<T>`

Root entity with change tracking:

```typescript
abstract class Aggregate<T extends { id: Id }> extends Entity<T> {
  getChanges(): AggregateChanges;

  // Domain Events
  protected addDomainEvent(event: IDomainEvent): void;
  getUncommittedEvents(): IDomainEvent[];
  clearEvents(): void;
  dispatchAll(bus: IDomainEventBus): Promise<void>;
}
```

#### `ValueObject<T>`

Immutable object compared by value:

```typescript
abstract class ValueObject<T> {
  readonly value: T;

  equals(other: ValueObject<T>): boolean;
  toJSON(): T;
  protected clone(value: T): this;
}
```

### Criteria API

```typescript
class Criteria<T> {
  static create<T>(): Criteria<T>;

  // Filters
  where<K extends FieldPath<T>>(
    field: K,
    operator: FilterOperator,
    value: any
  ): this;

  // Ordering
  orderBy<K extends FieldPath<T>>(field: K, direction: "asc" | "desc"): this;

  // Pagination
  limit(limit: number): this;
  offset(offset: number): this;
  paginate(page: number, pageSize: number): this;

  // Search
  search(term: string): this;

  // Getters
  getFilters(): Filter<T>[];
  getOrdering(): Order<T> | null;
  getPagination(): Pagination | null;
  getSearch(): string | null;
}
```

### Exception Handling

Rich Domain provides comprehensive exception types:

```typescript
import {
  ValidationError,
  DomainError,
  EntityNotFoundError,
  DuplicateEntityError,
  ConcurrencyError,
  RepositoryError,
} from "@woltz/rich-domain";

try {
  const user = new User({
    /* invalid props */
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.entity); // "User"
    console.log(error.field); // "email"
    console.log(error.message); // "Invalid email format"
  }
}
```

## Package Format

This library is published as a **dual package** supporting both CommonJS and ES Modules:

```javascript
// CommonJS
const { Id, Entity, Aggregate } = require("@woltz/rich-domain");

// ES Modules
import { Id, Entity, Aggregate } from "@woltz/rich-domain";
```

Benefits:

- ✅ Universal compatibility (Node.js, Vite, Webpack, etc.)
- ✅ Tree-shaking support for modern bundlers
- ✅ Full TypeScript support with type definitions
- ✅ Zero configuration - automatically uses the correct format

## Documentation

- 📚 [Full Documentation](https://woltz.mintlify.app)
- 🚀 [Quick Start Guide](https://woltz.mintlify.app/quickstart)
- 📖 [Core Concepts](https://woltz.mintlify.app/core/entities-and-aggregates)
- 🔌 [Integrations](https://woltz.mintlify.app/integrations/prisma)
- ⚛️ [React Components](https://woltz.mintlify.app/integrations/react)

## Examples

Check out the [examples directory](./examples) for complete implementations:

- Basic CRUD operations
- Complex aggregate relationships
- Custom validation rules
- Domain events
- Repository implementations for different ORMs

## Ecosystem

| Package                                                                                          | Description          | Version                                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [@woltz/rich-domain](https://www.npmjs.com/package/@woltz/rich-domain)                           | Core library         | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain.svg)](https://www.npmjs.com/package/@woltz/rich-domain)                           |
| [@woltz/rich-domain-prisma](https://www.npmjs.com/package/@woltz/rich-domain-prisma)             | Prisma adapter       | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-prisma.svg)](https://www.npmjs.com/package/@woltz/rich-domain-prisma)             |
| [@woltz/rich-domain-typeorm](https://www.npmjs.com/package/@woltz/rich-domain-typeorm)           | TypeORM adapter      | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-typeorm.svg)](https://www.npmjs.com/package/@woltz/rich-domain-typeorm)           |
| [@woltz/rich-domain-criteria-zod](https://www.npmjs.com/package/@woltz/rich-domain-criteria-zod) | Zod criteria builder | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-criteria-zod.svg)](https://www.npmjs.com/package/@woltz/rich-domain-criteria-zod) |
| [@woltz/rich-domain-cli](https://www.npmjs.com/package/@woltz/rich-domain-cli)                   | CLI tool             | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-cli.svg)](https://www.npmjs.com/package/@woltz/rich-domain-cli)                   |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT © [Tarcisio Andrade](https://github.com/tarcisioandrade)

## Links

- [Documentation](https://woltz.mintlify.app)
- [GitHub Repository](https://github.com/tarcisioandrade/rich-domain)
- [npm Package](https://www.npmjs.com/package/@woltz/rich-domain)
- [Issues](https://github.com/tarcisioandrade/rich-domain/issues)
- [Changelog](./CHANGELOG.md)
