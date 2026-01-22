# Criteria Zod

Zod schemas for validating Criteria query parameters in REST APIs.

## Installation

```bash
npm install @woltz/rich-domain-criteria-zod zod
```

## Quick Start

```typescript
import { defineFilters, CriteriaQuerySchema, PaginatedResponseSchema } from "@woltz/rich-domain-criteria-zod";
import { z } from "zod";

// 1. Define filterable fields
const filters = defineFilters((f) => ({
  name: f.string(),
  email: f.email(),
  age: f.number(),
  isActive: f.boolean(),
  createdAt: f.date(),
}));

// 2. Create query schema
const querySchema = CriteriaQuerySchema(filters, {
  orderBy: ["name", "createdAt"] as const,
  pagination: { defaultLimit: 20, maxLimit: 100 },
});

// 3. Create response schema
const UserDto = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

const responseSchema = PaginatedResponseSchema(UserDto);
```

## Define Filters

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

  // Restrict operators
  status: f.string({ operators: ["equals", "in"] }),

  // Nested paths
  ["author.name"]: f.string(),
  ["profile.role"]: f.string({ operators: ["equals"] }),
}));
```

### Field Types and Operators

| Method | Operators |
|--------|-----------|
| `f.string()` | equals, notEquals, contains, startsWith, endsWith, in, notIn, isNull, isNotNull |
| `f.email()` | Same as string (with email validation) |
| `f.number()` | equals, notEquals, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, between, in, notIn, isNull, isNotNull |
| `f.date()` | Same as number |
| `f.boolean()` | equals, notEquals, isNull, isNotNull |
| `f.array.*` | in, notIn, isNull, isNotNull |

## CriteriaQuerySchema Options

```typescript
const querySchema = CriteriaQuerySchema(filters, {
  // Whitelist of orderable fields (required for type safety)
  orderBy: ["name", "createdAt", "age"] as const,

  // Pagination options
  pagination: {
    defaultPage: 1,      // Default: 1
    defaultLimit: 20,    // Default: 10
    maxLimit: 100,       // Default: 100
  },
});
```

**Why whitelist orderBy?**
- Array fields can't be ordered
- Nested relations may not support ordering
- Non-indexed fields could cause performance issues

## Query String Format

```
GET /users?name:contains=john&age:greaterThan=18&orderBy=name:asc&page=1&limit=20
```

### Filter Operators

```
# String
?name:equals=John
?name:contains=ohn
?name:startsWith=Jo
?name:in=John,Jane,Bob
?name:isNull=true

# Number
?age:equals=25
?age:greaterThan=18
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
```

### Search

```
?search=john
```

## Framework Integration

### Fastify

```typescript
import Fastify from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { Criteria } from "@woltz/rich-domain";

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
    const result = await userRepository.find(criteria);
    return result.toJSON();
  },
});
```

### Express

```typescript
import express from "express";
import { Criteria } from "@woltz/rich-domain";

const app = express();

app.get("/users", (req, res) => {
  const result = querySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten(),
    });
  }

  const criteria = Criteria.fromQueryParams(result.data);
  const users = await userRepository.find(criteria);
  res.json(users.toJSON());
});
```

### Hono

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { Criteria } from "@woltz/rich-domain";

const app = new Hono();

app.get(
  "/users",
  zValidator("query", querySchema),
  async (c) => {
    const query = c.req.valid("query");
    const criteria = Criteria.fromQueryParams(query);
    const result = await userRepository.find(criteria);
    return c.json(result.toJSON());
  }
);
```

### tRPC

```typescript
import { router, publicProcedure } from "./trpc";
import { Criteria } from "@woltz/rich-domain";

export const userRouter = router({
  list: publicProcedure
    .input(querySchema)
    .query(async ({ input }) => {
      const criteria = Criteria.fromQueryParams(input);
      return userRepository.find(criteria);
    }),
});
```

## Type Inference

```typescript
import { InferCriteriaQuery, OrderEnum } from "@woltz/rich-domain-criteria-zod";

// Infer query type from schema
type UserQuery = InferCriteriaQuery<typeof querySchema>;

// Create order type from fields
type UserOrder = OrderEnum<["name", "createdAt"]>;
// "name:asc" | "name:desc" | "createdAt:asc" | "createdAt:desc"
```

## Complete Example

```typescript
// schemas/user-query.ts
import { defineFilters, CriteriaQuerySchema, PaginatedResponseSchema } from "@woltz/rich-domain-criteria-zod";
import { z } from "zod";

const userFilters = defineFilters((f) => ({
  name: f.string(),
  email: f.email(),
  status: f.string({ operators: ["equals", "in"] }),
  role: f.string({ operators: ["equals", "in"] }),
  age: f.number(),
  createdAt: f.date(),
  "department.name": f.string(),
}));

export const UserQuerySchema = CriteriaQuerySchema(userFilters, {
  orderBy: ["name", "email", "createdAt"] as const,
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
});

export const UserDto = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  status: z.enum(["active", "inactive", "pending"]),
  role: z.string(),
  createdAt: z.string(),
});

export const UserListResponseSchema = PaginatedResponseSchema(UserDto);

// routes/users.ts
app.get("/users", {
  schema: {
    querystring: UserQuerySchema,
    response: { 200: UserListResponseSchema },
  },
  handler: async (request) => {
    const criteria = Criteria.fromQueryParams<User>(request.query);
    const result = await userRepository.find(criteria);
    return result.toJSON();
  },
});
```
