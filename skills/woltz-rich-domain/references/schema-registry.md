# Schema Registry

EntitySchemaRegistry maps domain entities to database tables and handles relationships. Used only in adapters.

## Basic Usage

```typescript
import { EntitySchemaRegistry } from "@woltz/rich-domain-prisma";
// or
import { EntitySchemaRegistry } from "@woltz/rich-domain-typeorm";

const registry = new EntitySchemaRegistry()
  .register({
    entity: "User",
    table: "users",
  })
  .register({
    entity: "Post",
    table: "posts",
    parentFk: {
      field: "authorId",
      parentEntity: "User",
    },
  });
```

## Configuration Options

### Entity Registration

```typescript
.register({
  // Required: Domain entity name
  entity: "User",

  // Optional: Database table name (defaults to entity name)
  table: "users",

  // Optional: Field name mappings (domain → database)
  fields: {
    content: "main_content",
    createdAt: "created_at",
  },

  // Optional: Parent foreign key (for child entities)
  parentFk: {
    field: "authorId",        // FK field name in database
    parentEntity: "User",     // Parent entity name
  },
  // Optional: Collection relationships
  collections: {
    posts: { type: "owned", entity: "Post" },
    // Field name related to the relationship in the domain;
    // 'posts.tags' <- Domain Relation field name is 'tags'
    tags: {
      type: "reference",
      entity: "Tag",
      // Optional if Prisma is responsible for creating the pivot (junction) table, automatically use "_{table}" and "A", "B" keys.
      junction: {
        table: "_PostToTag",
        sourceKey: "A",
        targetKey: "B",
      },
    },
  },
})
```

## Collection Types

### Owned (1:N)

Parent owns children. Children are created/deleted with parent.

```typescript
// User has many Posts (User owns Posts)
.register({
  entity: "User",
  table: "users",
  collections: {
    posts: { type: "owned", entity: "Post" },
    comments: { type: "owned", entity: "Comment" },
  },
})
.register({
  entity: "Post",
  table: "posts",
  parentFk: { field: "authorId", parentEntity: "User" },
})
```

**Behavior:**

- Adding post to user → INSERT into posts
- Removing post from user → DELETE from posts
- BatchExecutor handles create/delete automatically

### Reference (N:N)

Entities exist independently. Junction table manages relationships.

```typescript
// Post has many Tags (many-to-many)
.register({
  entity: "Post",
  table: "posts",
  collections: {
    tags: {
      type: "reference",
      entity: "Tag",
      junction: {
        table: "_PostToTag",    // Junction table name
        sourceKey: "A",         // FK to Post (source)
        targetKey: "B",         // FK to Tag (target)
      },
    },
  },
})
.register({
  entity: "Tag",
  table: "tags",
})
```

**Behavior:**

- Adding tag to post → INSERT into junction table
- Removing tag from post → DELETE from junction table
- Tag entity itself is NOT deleted

## Field Mappings

Map domain field names to database column names:

```typescript
.register({
  entity: "Post",
  table: "posts",
  fields: {
    // domain field → database column
    content: "main_content",
    createdAt: "created_at",
    updatedAt: "updated_at",
    authorId: "author_id",
  },
})
```

## Complete Example

```typescript
const schemaRegistry = new EntitySchemaRegistry()
  // Root aggregate
  .register({
    entity: "Order",
    table: "orders",
    collections: {
      items: { type: "owned", entity: "OrderItem" },
    },
  })

  // Child entity (owned by Order)
  .register({
    entity: "OrderItem",
    table: "order_items",
    fields: {
      unitPrice: "unit_price",
    },
    parentFk: {
      field: "orderId",
      parentEntity: "Order",
    },
    collections: {
      addons: { type: "owned", entity: "OrderItemAddon" },
    },
  })

  // Grandchild entity (owned by OrderItem)
  .register({
    entity: "OrderItemAddon",
    table: "order_item_addons",
    parentFk: {
      field: "orderItemId",
      parentEntity: "OrderItem",
    },
  })

  // Reference entity (many-to-many)
  .register({
    entity: "Product",
    table: "products",
    collections: {
      categories: {
        type: "reference",
        entity: "Category",
        junction: {
          table: "_ProductToCategory",
          sourceKey: "productId",
          targetKey: "categoryId",
        },
      },
    },
  })

  .register({
    entity: "Category",
    table: "categories",
  });
```

## Usage with Mappers

### Prisma

```typescript
class OrderToPersistenceMapper extends PrismaToPersistence<Order> {
  protected readonly registry = schemaRegistry;

  protected async onUpdate(
    order: Order,
    changes: AggregateChanges
  ): Promise<void> {
    const executor = new PrismaBatchExecutor(this.context, {
      registry: this.registry,
      rootId: order.id.value,
      dataMappers: {
        OrderItem: (item) => ({
          id: item.data.id.value,
          productId: item.data.productId,
          quantity: item.data.quantity,
          unit_price: item.data.unitPrice, // Uses field mapping
          orderId: item.parentId,
        }),
        OrderItemAddon: (item) => ({
          id: item.data.id.value,
          name: item.data.name,
          price: item.data.price,
          orderItemId: item.parentId,
        }),
      },
    });

    await executor.execute(changes);
  }
}
```

### TypeORM

```typescript
class OrderToPersistenceMapper extends TypeORMToPersistence<Order> {
  protected readonly registry = schemaRegistry;

  protected readonly entityClasses = new Map([
    ["Order", OrderEntity],
    ["OrderItem", OrderItemEntity],
    ["OrderItemAddon", OrderItemAddonEntity],
    ["Product", ProductEntity],
    ["Category", CategoryEntity],
  ]);
}
```

## Depth and Ordering

Registry automatically calculates entity depth for proper FK ordering:

```
Order (depth: 0)
└── OrderItem (depth: 1)
    └── OrderItemAddon (depth: 2)
```

**BatchExecutor uses depth for:**

- Deletes: leaf → root (depth DESC) - delete children first
- Creates: root → leaf (depth ASC) - create parent first
- Updates: any order

## Junction Table Naming

For Prisma implicit many-to-many:

```typescript
// Prisma generates "_PostToTag" with columns "A" and "B"
junction: {
  table: "_PostToTag",
  sourceKey: "A",
  targetKey: "B",
}
```

For explicit junction tables:

```typescript
// Custom junction table with named columns
junction: {
  table: "post_tags",
  sourceKey: "post_id",
  targetKey: "tag_id",
}
```

**Important:** Junction config must match your database schema exactly.
