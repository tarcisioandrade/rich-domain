# Criteria API

Type-safe query building for repositories.

## Basic Usage

```typescript
import { Criteria } from "@woltz/rich-domain";

const criteria = Criteria.create<User>()
  .where("status", "equals", "active")
  .where("age", "greaterThan", 18)
  .orderBy("createdAt", "desc")
  .paginate(1, 20);

const result = await userRepository.find(criteria);
// result.data: User[]
// result.meta: { page, limit, total, totalPages }
```

## Filter Operators

### String Operators

```typescript
.where("name", "equals", "John")
.where("name", "notEquals", "Jane")
.where("name", "contains", "oh")
.where("name", "startsWith", "Jo")
.where("name", "endsWith", "hn")
.where("name", "in", ["John", "Jane", "Bob"])
.where("name", "notIn", ["Admin", "System"])
.where("name", "isNull", true)
.where("name", "isNotNull", true)

// Shorthand methods
.whereEquals("name", "John")
.whereContains("name", "oh")
.whereStartsWith("name", "Jo")
.whereEndsWith("name", "hn")
.whereIn("name", ["John", "Jane"])
.whereNull("name")
.whereNotNull("name")
```

### Number Operators

```typescript
.where("age", "equals", 25)
.where("age", "notEquals", 0)
.where("age", "greaterThan", 18)
.where("age", "greaterThanOrEqual", 18)
.where("age", "lessThan", 65)
.where("age", "lessThanOrEqual", 65)
.where("age", "between", [18, 65])
.where("price", "in", [10, 20, 30])
.where("stock", "isNull", true)
```

### Date Operators

```typescript
.where("createdAt", "equals", new Date("2024-01-01"))
.where("createdAt", "greaterThan", new Date("2024-01-01"))
.where("createdAt", "lessThan", new Date("2024-12-31"))
.where("createdAt", "between", [startDate, endDate])
```

### Boolean Operators

```typescript
.where("isActive", "equals", true)
.where("isVerified", "notEquals", false)
```

## Nested Paths

### Object Properties

```typescript
// Filter by nested object property
.where("profile.bio", "contains", "developer")
.where("address.city", "equals", "New York")
.where("settings.theme", "in", ["dark", "light"])
```

### Array Items

```typescript
// Filter by array item property
.where("posts.views", "greaterThan", 100)
.where("tags.name", "contains", "featured")
```

## Array Quantifiers

```typescript
// At least one item matches (some)
.whereSome("tags", "equals", "featured")
.whereSome("scores", "greaterThan", 90)

// All items must match (every)
.whereEvery("items.status", "equals", "completed")
.whereEvery("grades", "greaterThanOrEqual", 60)

// No item should match (none)
.whereNone("categories", "equals", "banned")
.whereNone("reviews.rating", "lessThan", 3)
```

## Ordering

```typescript
// Single field
.orderBy("name", "asc")
.orderBy("createdAt", "desc")

// Shorthand
.orderByAsc("name")
.orderByDesc("createdAt")

// Multiple fields (chain calls)
.orderBy("status", "asc")
.orderBy("createdAt", "desc")
```

## Pagination

```typescript
// Page-based
.paginate(1, 20)  // page 1, 20 items per page

// Offset-based
.limit(20)
.offset(40)

// Get pagination info
const pagination = criteria.getPagination();
// { page: 1, limit: 20, offset: 0 }
```

## Search

```typescript
// Full-text search across configured fields
.search("john doe")

// Repository must implement searchable fields
protected getSearchableFields() {
  return ["name", "email", "bio"];
}
```

## Combining Filters

```typescript
const criteria = Criteria.create<Product>()
  // Multiple conditions (AND)
  .where("status", "equals", "active")
  .where("price", "lessThan", 100)
  .where("stock", "greaterThan", 0)

  // With nested path
  .where("category.name", "in", ["Electronics", "Books"])

  // With array quantifier
  .whereSome("tags", "equals", "sale")

  // With search
  .search("wireless")

  // With ordering
  .orderBy("price", "asc")
  .orderBy("rating", "desc")

  // With pagination
  .paginate(1, 20);
```

## Serialization

### To JSON

```typescript
const criteria = Criteria.create<User>()
  .where("status", "equals", "active")
  .orderBy("name", "asc")
  .paginate(1, 10);

const json = criteria.toJSON();
// {
//   filters: [{ field: "status", operator: "equals", value: "active" }],
//   orderBy: { field: "name", direction: "asc" },
//   pagination: { page: 1, limit: 10 }
// }
```

### From JSON

```typescript
const json = {
  /* ... */
};
const criteria = Criteria.fromObject<User>(json);
```

### From Query Parameters

```typescript
// URL: /users?status:equals=active&orderBy=name:asc&page=1&limit=10
const criteria = Criteria.fromQueryParams<User>(request.query);
```

## Field Adapters

Map API field names to database columns:

```typescript
const adapter = {
  firstName: "first_name",
  lastName: "last_name",
  createdAt: "created_at",
};

const criteria = Criteria.create<User>()
  .useAdapter(adapter)
  .where("firstName", "equals", "John"); // Maps to first_name
```

## Getters

```typescript
const criteria = Criteria.create<User>()
  .where("status", "equals", "active")
  .orderBy("name", "asc")
  .paginate(1, 20)
  .search("john");

// Get individual parts
const filters = criteria.getFilters();
// [{ field: "status", operator: "equals", value: "active" }]

const ordering = criteria.getOrdering();
// { field: "name", direction: "asc" }

const pagination = criteria.getPagination();
// { page: 1, limit: 20, offset: 0 }

const search = criteria.getSearch();
// "john"
```

## PaginatedResult

```typescript
// From repository
const result = await userRepository.find(criteria);

// Access data
result.data; // User[]
result.meta.page; // 1
result.meta.limit; // 20
result.meta.total; // 150
result.meta.totalPages; // 8

// Serialize for API
const json = result.toJSON();
// {
//   data: [...],
//   meta: { page: 1, limit: 20, total: 150, totalPages: 8 }
// }

// Create from array (for testing)
const mockResult = PaginatedResult.fromArray(users, criteria);
```
