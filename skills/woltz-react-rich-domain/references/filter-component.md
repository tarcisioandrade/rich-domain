# Filter Component

Pre-built filter UI component that integrates with `useCriteria`.

## Installation

```bash
npx shadcn add "https://tarcisioandrade.github.io/rich-domain/packages/react-rich-domain/public/r/filter.json"
```

## Basic Usage

```typescript
import { useCriteria } from "@/hooks/use-criteria";
import { Filter } from "@/components/filter/filter";
import type { QueryFilter } from "@/lib/filter-utils";

interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "pending";
  age: number;
  createdAt: Date;
}

const userFields: QueryFilter[] = [
  { field: "name", fieldLabel: "Name", type: "string" },
  { field: "email", fieldLabel: "Email", type: "string" },
  {
    field: "status",
    fieldLabel: "Status",
    type: "string",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "pending", label: "Pending" },
    ],
  },
  { field: "age", fieldLabel: "Age", type: "number" },
  { field: "createdAt", fieldLabel: "Created At", type: "date" },
];

function UserFilters() {
  const { filters, addOrReplaceByIndex, removeFilter, clearFilters } =
    useCriteria<User>();

  return (
    <Filter
      fields={userFields}
      filters={filters}
      addOrReplaceByIndex={addOrReplaceByIndex}
      removeFilter={removeFilter}
      clearFilters={clearFilters}
    />
  );
}
```

---

## QueryFilter Type

```typescript
interface QueryFilter {
  field: string; // Field path (e.g., "name", "profile.bio")
  fieldLabel: string; // Display label
  type: "string" | "number" | "date" | "boolean";
  options?: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  multiSelect?: boolean; // Allow multiple values for "in" operator
  isNullable?: boolean; // Allow isNull/isNotNull operators
  isCollection?: boolean; // Mark if field path traverses a collection (1:N or N:N)
}
```

---

## Operators by Field Type

| Type      | Operators                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `string`  | equals, notEquals, contains, startsWith, endsWith, in, notIn, isNull, isNotNull                                      |
| `number`  | equals, notEquals, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, between, in, notIn, isNull, isNotNull |
| `date`    | equals, notEquals, greaterThan, lessThan, between, isNull, isNotNull                                                 |
| `boolean` | equals, notEquals, isNull, isNotNull                                                                                 |

---

## With Options (Select Fields)

```typescript
const orderFields: QueryFilter[] = [
  {
    field: "status",
    fieldLabel: "Order Status",
    type: "string",
    options: [
      { value: "draft", label: "Draft", icon: <FileIcon /> },
      { value: "confirmed", label: "Confirmed", icon: <CheckIcon /> },
      { value: "shipped", label: "Shipped", icon: <TruckIcon /> },
      { value: "delivered", label: "Delivered", icon: <PackageIcon /> },
    ],
  },
  {
    field: "priority",
    fieldLabel: "Priority",
    type: "string",
    multiSelect: true,  // Allow selecting multiple priorities
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
  },
];
```

---

## Nested Fields

Support for nested entity paths:

```typescript
const userFields: QueryFilter[] = [
  { field: "profile.bio", fieldLabel: "Bio", type: "string" },
  { field: "address.city", fieldLabel: "City", type: "string" },
  {
    field: "address.country",
    fieldLabel: "Country",
    type: "string",
    options: [
      { value: "US", label: "United States" },
      { value: "BR", label: "Brazil" },
      { value: "UK", label: "United Kingdom" },
    ],
  },
];
```

---

## Collection Fields

When filtering through a 1:N or N:N relation, use `isCollection: true`:

```typescript
const userFields: QueryFilter[] = [
  { field: "name", fieldLabel: "Name", type: "string" },
  // Filtering through User's posts collection
  {
    field: "posts.title",
    fieldLabel: "Post Title",
    type: "string",
    isCollection: true, // Required for collections
  },
  {
    field: "posts.status",
    fieldLabel: "Post Status",
    type: "string",
    isCollection: true,
    options: [
      { value: "draft", label: "Draft" },
      { value: "published", label: "Published" },
    ],
  },
];
```

This ensures the correct Prisma query is generated with `{ some: ... }` quantifier.

---

## Integration with DataTableCriteria

The Filter component is already integrated when using `filterProps`:

```typescript
const { table, filterProps, searchProps } = useCriteriaTable({
  columns,
  filterFields: userFields,
  queryKey: ["users"],
  queryFn: fetchUsers,
});

// filterProps contains all necessary props for the Filter component
<DataTableCriteria
  table={table}
  filterProps={filterProps}
  {...searchProps}
/>
```

---

## Standalone Usage

Use Filter separately for custom layouts:

```typescript
import { useCriteria } from "@/hooks/use-criteria";
import { Filter } from "@/components/filter/filter";

function CustomFilterBar() {
  const criteria = useCriteria<Product>({
    syncWithUrl: true,
  });

  return (
    <div className="flex items-center gap-4">
      <Filter
        fields={productFields}
        filters={criteria.filters}
        addOrReplaceByIndex={criteria.addOrReplaceByIndex}
        removeFilter={criteria.removeFilter}
        clearFilters={criteria.clearFilters}
      />

      {/* Custom action buttons */}
      <Button onClick={() => criteria.clearAll()}>
        Reset All
      </Button>
    </div>
  );
}
```

---

## Filter Props

| Prop                  | Type            | Required | Description                    |
| --------------------- | --------------- | -------- | ------------------------------ |
| `fields`              | `QueryFilter[]` | Yes      | Available fields for filtering |
| `filters`             | `Filter[]`      | Yes      | Current active filters         |
| `addOrReplaceByIndex` | `function`      | Yes      | Add or update a filter         |
| `removeFilter`        | `function`      | Yes      | Remove a filter by index       |
| `clearFilters`        | `function`      | Yes      | Clear all filters              |
