# Sorting Component

Pre-built sorting UI component with drag-and-drop support for reordering sort priority.

## Installation

```bash
npx shadcn add "https://tarcisioandrade.github.io/rich-domain/packages/react-rich-domain/public/r/sorting.json"
```

## Basic Usage

```typescript
import { useCriteria } from "@/hooks/use-criteria";
import { Sorting } from "@/components/sorting";
import type { SortingField } from "@/components/sorting";

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  createdAt: Date;
}

const sortingFields: SortingField[] = [
  { field: "name", fieldLabel: "Name" },
  { field: "email", fieldLabel: "Email" },
  { field: "age", fieldLabel: "Age" },
  { field: "createdAt", fieldLabel: "Created At" },
];

function UserSorting() {
  const criteria = useCriteria<User>({
    initialSort: [{ field: "name", direction: "asc" }],
  });

  return <Sorting fields={sortingFields} criteria={criteria} />;
}
```

---

## SortingField Type

```typescript
interface SortingField {
  field: string;      // Field path in the entity (e.g., "name", "profile.bio")
  fieldLabel: string; // Display label for the field
}
```

---

## Features

- **One-click add**: Click a field to add it with default "asc" direction
- **Drag-and-drop reordering**: Change sort priority by dragging items
- **Toggle direction**: Click the direction button to switch between ascending/descending
- **Remove sorts**: Individual remove buttons for each sort
- **Clear all**: One button to clear all sorting
- **Duplicate prevention**: Automatically prevents duplicate fields

---

## Multi-level Sorting

The order of sorts matters - the first sort is applied first:

```typescript
const criteria = useCriteria<User>({
  initialSort: [
    { field: "status", direction: "asc" },
    { field: "name", direction: "asc" },
  ],
});

// Users will be grouped by status (active, inactive, pending)
// Within each status group, they'll be sorted alphabetically by name
```

---

## Drag-and-Drop Reordering

Uses [@dnd-kit](https://dndkit.com/) for smooth interactions:

```typescript
import { Sorting } from "@/components/sorting";

function ProductTable() {
  const criteria = useCriteria<Product>({
    initialSort: [
      { field: "price", direction: "desc" },
      { field: "name", direction: "asc" },
    ],
  });

  return (
    <div>
      <Sorting
        fields={[
          { field: "name", fieldLabel: "Name" },
          { field: "price", fieldLabel: "Price" },
          { field: "stock", fieldLabel: "Stock" },
          { field: "createdAt", fieldLabel: "Created" },
        ]}
        criteria={criteria}
      />

      {/* Your table or list */}
    </div>
  );
}
```

---

## Combined with Filter

```typescript
import { useCriteria } from "@/hooks/use-criteria";
import { Sorting } from "@/components/sorting";
import { Filter } from "@/components/filter/filter";

function UserManagement() {
  const criteria = useCriteria<User>({
    pageSize: 10,
    syncWithUrl: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Filter
          fields={filterFields}
          filters={criteria.filters}
          addOrReplaceByIndex={criteria.addOrReplaceByIndex}
          removeFilter={criteria.removeFilter}
          clearFilters={criteria.clearFilters}
        />

        <Sorting fields={sortingFields} criteria={criteria} />
      </div>

      <DataTable data={data} sorting={criteria.sorting} />
    </div>
  );
}
```

---

## Programmatic Sorting

Use criteria methods directly:

```typescript
const { addSort, removeSort, removeSortByField, clearSort, sorting } = useCriteria<User>();

// Add sort
addSort("createdAt", "desc");

// Remove by index
removeSort(0);

// Remove by field
removeSortByField("createdAt");

// Clear all
clearSort();

// Read current sorting
console.log(sorting);
// [{ field: "createdAt", direction: "desc" }]
```

---

## Sorting Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `fields` | `SortingField[]` | Yes | Available fields for sorting |
| `criteria` | `UseCriteriaReturn` | Yes | Criteria instance from useCriteria |

---

## Complete Example with Table

```typescript
import { useQuery } from "@tanstack/react-query";
import { useCriteria } from "@/hooks/use-criteria";
import { Filter } from "@/components/filter/filter";
import { Sorting } from "@/components/sorting";

function ProductList() {
  const {
    criteria,
    filters,
    sorting,
    pagination,
    addOrReplaceByIndex,
    removeFilter,
    clearFilters,
    setPage,
  } = useCriteria<Product>({
    pageSize: 10,
    syncWithUrl: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", criteria.toJSON()],
    queryFn: () => fetchProducts(criteria),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Filter
          fields={productFields}
          filters={filters}
          addOrReplaceByIndex={addOrReplaceByIndex}
          removeFilter={removeFilter}
          clearFilters={clearFilters}
        />

        <Sorting
          fields={[
            { field: "name", fieldLabel: "Name" },
            { field: "price", fieldLabel: "Price" },
            { field: "stock", fieldLabel: "Stock" },
          ]}
          criteria={{ sorting, addSort, removeSort, clearSort }}
        />
      </div>

      {/* Table with sorting indicators */}
      <table className="w-full">
        <thead>
          <tr>
            {["name", "price", "stock"].map((field) => {
              const sort = sorting.find((s) => s.field === field);
              return (
                <th key={field}>
                  {field}
                  {sort && (sort.direction === "asc" ? " ▲" : " ▼")}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data?.data.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>${product.price}</td>
              <td>{product.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex gap-2">
        <button onClick={() => setPage(pagination.page - 1)}>Previous</button>
        <span>Page {pagination.page}</span>
        <button onClick={() => setPage(pagination.page + 1)}>Next</button>
      </div>
    </div>
  );
}
```
