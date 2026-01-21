# Core Concepts

## Aggregate

Root entity that defines consistency boundaries and controls access to child entities.

```typescript
import { Aggregate, Id } from "@woltz/rich-domain";
import { z } from "zod";

const OrderSchema = z.object({
  id: z.custom<Id>(),
  customerId: z.string(),
  status: z.enum(["draft", "confirmed", "shipped"]),
  items: z.array(z.instanceof(OrderItem)),
  createdAt: z.date(),
});

class Order extends Aggregate<z.infer<typeof OrderSchema>> {
  protected static validation = { schema: OrderSchema };

  getTypedChanges() {
    interface Entities {
      OrderItem: OrderItem
    };
    return this.getChanges<Entities>();
  }

  addItem(productId: string, quantity: number, price: number): void {
    if (this.props.status !== "draft") {
      throw new DomainError("Cannot modify confirmed order");
    }
    this.props.items.push(new OrderItem({ productId, quantity, price }));
  }

  confirm(): void {
    if (this.props.items.length === 0) {
      throw new DomainError("Cannot confirm empty order");
    }
    this.props.status = "confirmed";
    this.addDomainEvent(new OrderConfirmedEvent(this.id, this.total));
  }

  get items() { return this.props.items; }
  get status() { return this.props.status; }
  get total() { return this.items.reduce((sum, i) => sum + i.subtotal, 0); }
}
```

### Optional Input Properties

Second generic parameter makes properties optional at construction:

```typescript
class User extends Aggregate<UserProps, "password" | "createdAt"> {
  protected static hooks = {
    onBeforeCreate: (props) => {
      if (!props.password) props.password = generatePassword();
      if (!props.createdAt) props.createdAt = new Date();
    },
  };
}

// Works without password and createdAt
const user = new User({ email: "a@b.com", name: "John" });
```

## Entity

Domain object with identity that lives inside an Aggregate.

```typescript
import { Entity, Id } from "@woltz/rich-domain";

const OrderItemSchema = z.object({
  id: z.custom<Id>(),
  productId: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
});

class OrderItem extends Entity<z.infer<typeof OrderItemSchema>> {
  protected static validation = { schema: OrderItemSchema };

  updateQuantity(quantity: number): void {
    if (quantity <= 0) throw new DomainError("Quantity must be positive");
    this.props.quantity = quantity;
  }

  get subtotal() { return this.props.quantity * this.props.price; }
}
```

## Value Object

Immutable object compared by value, not identity.

```typescript
import { ValueObject, throwValidationError } from "@woltz/rich-domain";

// Simple Value Object
class Email extends ValueObject<string> {
  protected static validation = {
    schema: z.string().email(),
  };

  getDomain(): string {
    return this.value.split("@")[1];
  }

  isBusinessEmail(): boolean {
    const freeProviders = ["gmail.com", "yahoo.com"];
    return !freeProviders.includes(this.getDomain());
  }
}

// Composite Value Object
class Money extends ValueObject<{ amount: number; currency: string }> {
  protected static validation = {
    schema: z.object({
      amount: z.number(),
      currency: z.string().length(3),
    }),
  };

  protected static hooks = {
    rules: (money) => {
      if (money.value.amount < 0) {
        throwValidationError("amount", "Amount cannot be negative");
      }
    },
  };

  add(other: Money): Money {
    if (this.value.currency !== other.value.currency) {
      throw new DomainError("Currency mismatch");
    }
    return this.clone({ amount: this.value.amount + other.value.amount });
  }

  format(): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: this.value.currency,
    }).format(this.value.amount);
  }
}

// Usage
const price = new Money({ amount: 99.99, currency: "USD" });
const withTax = price.add(new Money({ amount: 8.00, currency: "USD" }));
console.log(withTax.format()); // "$107.99"
```

## Id

Smart identifier that tracks whether entity is new or existing.

```typescript
import { Id } from "@woltz/rich-domain";

// New entity (will INSERT)
const newId = new Id();
console.log(newId.isNew);   // true
console.log(newId.value);   // "550e8400-e29b-..." (UUID v4)

// Existing entity (will UPDATE)
const existingId = Id.from("user-123");
console.log(existingId.isNew); // false

// Comparison
const id1 = Id.from("abc");
const id2 = Id.from("abc");
console.log(id1.equals(id2)); // true
```

## Lifecycle Hooks

```typescript
class Product extends Aggregate<ProductProps> {
  protected static validation = { schema: ProductSchema };

  protected static hooks = {
    // Before validation - set defaults
    onBeforeCreate: (props) => {
      if (!props.createdAt) props.createdAt = new Date();
      if (!props.sku) props.sku = generateSKU();
    },

    // After creation - side effects
    onCreate: (product) => {
      console.log(`Product created: ${product.name}`);
      product.addDomainEvent(new ProductCreatedEvent(product.id));
    },

    // Before update - validate transitions (return false to reject)
    onBeforeUpdate: (product, snapshot) => {
      // Can't modify archived products
      if (snapshot.status === "archived") return false;
      // Can't decrease price more than 50%
      if (product.price < snapshot.price * 0.5) return false;
      return true;
    },

    // Business rules - cross-field validation
    rules: (product) => {
      if (product.price > 1000 && product.stock === 0) {
        throwValidationError("stock", "Premium products must have stock");
      }
      if (product.discountPercent > 0 && !product.discountEndsAt) {
        throwValidationError("discountEndsAt", "Discount must have end date");
      }
    },
  };
}
```

## Domain Events

```typescript
import { DomainEvent, IDomainEventBus } from "@woltz/rich-domain";

// Define event
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

// Emit in aggregate
class Order extends Aggregate<OrderProps> {
  confirm(): void {
    this.props.status = "confirmed";
    this.addDomainEvent(
      new OrderConfirmedEvent(this.id, this.props.customerId, this.total)
    );
  }
}

// Dispatch after persistence
await orderRepository.save(order);
await order.dispatchAll(eventBus);
order.clearEvents();

// Event handler
class SendConfirmationEmail implements IDomainEventHandler<OrderConfirmedEvent> {
  async handle(event: OrderConfirmedEvent): Promise<void> {
    await emailService.send({
      to: event.customerId,
      subject: "Order Confirmed",
      body: `Your order total: $${event.total}`,
    });
  }
}
```

## Change Tracking

Changes are tracked automatically via Proxies.

```typescript
const order = await orderRepository.findById(orderId);

// Make changes
order.addItem("prod-1", 2, 29.99);      // Create
order.items[0].updateQuantity(5);        // Update
order.items.splice(1, 1);                // Delete

// Get changes
// We hard recommendly use this 'getTypedChanges' helper pattern to better DX;
const changes = order.getTypedChanges();

console.log(changes.hasChanges());  // true
console.log(changes.hasCreates());  // true
console.log(changes.hasUpdates());  // true
console.log(changes.hasDeletes());  // true

// Iterate changes
for (const create of changes.creates()) {
  console.log(create.entity, create.data);
}

// Batch operations (respects FK order)
const batch = changes.toBatchOperations();
// batch.deletes - leaf first (depth DESC)
// batch.creates - root first (depth ASC)
// batch.updates - any order

// After saving
order.markAsClean();
```

## Mappers

Transform between domain and persistence models.

```typescript
import { Mapper, Id } from "@woltz/rich-domain";

// Persistence → Domain
class UserToDomainMapper extends Mapper<UserRecord, User> {
  build(record: UserRecord): User {
    return new User({
      id: Id.from(record.id),
      email: new Email(record.email),
      name: record.user_name,
      posts: record.posts?.map(p => new Post({
        id: Id.from(p.id),
        title: p.title,
        content: p.main_content,
      })) ?? [],
      createdAt: record.created_at,
    });
  }
}

// Domain → Persistence
class UserToPersistenceMapper extends Mapper<User, UserRecord> {
  build(user: User): UserRecord {
    return {
      id: user.id.value,
      email: user.email,
      user_name: user.name,
      created_at: user.createdAt,
    };
  }
}
```

## Error Handling

```typescript
import {
  ValidationError,
  DomainError,
  EntityNotFoundError,
  throwValidationError,
} from "@woltz/rich-domain";

// Throw validation error in hooks
protected static hooks = {
  rules: (entity) => {
    if (entity.value < 0) {
      throwValidationError("value", "Must be positive");
    }
  },
};

// Catch validation errors
try {
  const user = new User({ email: "invalid" });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.entity);  // "User"
    console.log(error.field);   // "email"
    console.log(error.message); // "Invalid email"
  }
}

// Domain errors
class InsufficientFundsError extends DomainError {
  constructor(available: number, required: number) {
    super(`Insufficient funds: ${available} < ${required}`);
  }
}
```
