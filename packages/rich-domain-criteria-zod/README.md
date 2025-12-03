# @woltz/rich-domain-criteria-zod

Zod schema builders for [`@woltz/rich-domain`](https://github.com/tarcisioandrade/rich-domain) Criteria pattern. Framework-agnostic validation for filters, ordering, pagination, and search.

## Installation

```bash
npm install @woltz/rich-domain-criteria-zod
```

### Peer Dependencies

```bash
npm install @woltz/rich-domain zod
```

## Quick Start

```typescript
import {
  defineFilters,
  CriteriaQuerySchema,
  PaginatedResponseSchema,
} from "@woltz/rich-domain-criteria-zod";
import { z } from "zod";

// 1. Define filterable fields
const filters = defineFilters((f) => ({
  name: f.string(),
  email: f.email(),
  age: f.number(),
  isActive: f.boolean(),
  createdAt: f.date(),
  tags: f.array.string(),
}));

// 2. Create query schema with orderable fields whitelist
const querySchema = CriteriaQuerySchema(filters, {
  orderBy: ["name", "createdAt", "age"] as const,
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
});

// 3. Define response schema
const UserDto = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

const responseSchema = PaginatedResponseSchema(UserDto);
```

## Framework Integration

### Fastify

```typescript
import Fastify from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

const app = Fastify().withTypeProvider<ZodTypeProvider>();

app.route({
  method: "GET",
  url: "/users",
  schema: {
    querystring: querySchema,
    response: { 200: responseSchema },
  },
  handler: async (request) => {
    const criteria = Criteria.fromQueryParams(request.query);
    return userService.list(criteria);
  },
});
```

### Express

```typescript
app.get("/users", (req, res) => {
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  const criteria = Criteria.fromQueryParams(result.data);
  // ...
});
```

### Hono

```typescript
import { zValidator } from "@hono/zod-validator";

app.get("/users", zValidator("query", querySchema), (c) => {
  const query = c.req.valid("query");
  const criteria = Criteria.fromQueryParams(query);
  // ...
});
```

### tRPC

```typescript
export const userRouter = router({
  list: publicProcedure.input(querySchema).query(({ input }) => {
    const criteria = Criteria.fromQueryParams(input);
    return userService.list(criteria);
  }),
});
```

## API Reference

### `defineFilters(builder)`

Defines filterable fields with their types and operators.

```typescript
const filters = defineFilters((f) => ({
  // Basic types
  name: f.string(),
  email: f.email(),
  age: f.number(),
  isActive: f.boolean(),
  createdAt: f.date(),

  // Arrays
  tags: f.array.string(),
  scores: f.array.number(),
  roles: f.array.enum(["admin", "user", "guest"]),

  // Custom operators (restrict available operators)
  status: f.string({ operators: ["equals", "in"] }),

  // Nested paths
  ["author.name"]: f.string(),
}));
```

### Field Types

| Method        | Operators                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `f.string()`  | equals, notEquals, contains, startsWith, endsWith, in, notIn, isNull, isNotNull                                      |
| `f.email()`   | Same as string (with email validation)                                                                               |
| `f.number()`  | equals, notEquals, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, in, notIn, between, isNull, isNotNull |
| `f.date()`    | Same as number                                                                                                       |
| `f.boolean()` | equals, notEquals, isNull, isNotNull                                                                                 |
| `f.array.*`   | in, notIn, isNull, isNotNull                                                                                         |

### `CriteriaQuerySchema(filters, options?)`

Creates a complete query schema with filters, ordering, pagination, and search.

```typescript
const querySchema = CriteriaQuerySchema(filters, {
  // Whitelist of orderable fields (required for type safety)
  orderBy: ["name", "createdAt"] as const,

  // Pagination defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
});
```

**Why whitelist for orderBy?**

Not all filterable fields should be orderable:

- Array fields can't be ordered
- Nested relations may not support ordering
- Non-indexed fields could cause performance issues

### `PaginatedResponseSchema(itemSchema)`

Creates a response schema matching `PaginatedResult.toJSON()` output.

```typescript
const responseSchema = PaginatedResponseSchema(UserDto);

// Inferred type:
// {
//   data: User[];
//   meta: {
//     page: number;
//     limit: number;
//     total: number;
//     totalPages: number;
//   };
// }
```

## Query String Format

The schema accepts query strings in this format:

```
GET /users?name:contains=john&age:greaterThan=18&orderBy=name:asc&page=1&limit=20
```

### Filter Operators

```
# String
?name:equals=John
?name:contains=ohn
?name:startsWith=Jo
?name:endsWith=hn
?name:in=John,Jane,Bob
?name:isNull=true

# Number
?age:equals=25
?age:greaterThan=18
?age:lessThanOrEqual=65
?age:between=18,65
?price:in=10,20,30

# Date
?createdAt:greaterThan=2024-01-01
?createdAt:between=2024-01-01,2024-12-31

# Boolean
?isActive:equals=true
```

### Ordering

```
# Single field
?orderBy=name:asc
?orderBy=createdAt:desc

# Multiple fields
?orderBy=name:asc,createdAt:desc
```

### Pagination

```
?page=1&limit=20

# Or as object
?pagination={"page":1,"limit":20}
```

### Search

```
?search=john
```

## Type Inference

```typescript
import { InferCriteriaQuery, OrderEnum } from "@woltz/rich-domain-criteria-zod";

// Infer query type
type UserQuery = InferCriteriaQuery<typeof querySchema>;

// orderBy is typed as union:
// "name:asc" | "name:desc" | "createdAt:asc" | "createdAt:desc" | ...

// Create order type from fields
type UserOrder = OrderEnum<["name", "createdAt"]>;
// "name:asc" | "name:desc" | "createdAt:asc" | "createdAt:desc"
```

## License

MIT
