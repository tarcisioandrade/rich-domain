# DataTable with useCriteria Integration

This package provides a seamless integration between TanStack Table and the `useCriteria` hook for building powerful data tables with filtering, sorting, and pagination.

## Overview

The integration consists of:

- **`useCriteriaTable`**: Hook that combines `useCriteria`, `useQuery`, and `useReactTable`
- **`DataTableCriteria`**: Component optimized for server-side data tables
- **`DataTable`**: Base table component (client-side)
- **`Filter`**: Advanced filtering component
- **Enhanced Pagination**: Works with `PaginatedResult` metadata

## Quick Start

### Basic Usage

```tsx
import { useCriteriaTable } from "./hooks/use-criteria-table";
import { DataTableCriteria } from "./components/table/data-table-criteria";
import { Filter } from "./components/filter/filter";
import { DataTableColumnHeader } from "./components/table/data-table-column-header";

// Define your columns
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
];

// Define filter fields
const filterFields: QueryFilter[] = [
  {
    type: "string",
    field: "name",
    fieldLabel: "Name",
  },
  {
    type: "string",
    field: "email",
    fieldLabel: "Email",
  },
];

// Use in your component
export function UserList() {
  const { table, data, isLoading, filterProps, searchProps } = useCriteriaTable<User>({
    columns,
    filterFields,
    queryKey: ["users"],
    queryFn: getUsers,
    criteriaOptions: {
      pageSize: 20,
      syncWithUrl: true,
    },
  });

  return (
    <div className="space-y-4">
      <Filter {...filterProps} />
      <DataTableCriteria
        table={table}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Search users..."
        {...searchProps}
      />
    </div>
  );
}
```

## API Reference

### `useCriteriaTable<T>(options)`

Hook that manages table state, criteria, and data fetching.

#### Options

```typescript
interface UseCriteriaTableOptions<T> {
  // TanStack Table columns
  columns: ColumnDef<T>[];

  // Filter field definitions
  filterFields?: QueryFilter[];

  // React Query key
  queryKey: QueryKey;

  // Query function (receives Criteria, returns PaginatedResult)
  queryFn: (criteria: Criteria<T>) => Promise<PaginatedResult<T>>;

  // useCriteria options
  criteriaOptions?: {
    initialPage?: number;
    pageSize?: number;
    initialFilters?: Filter[];
    initialSort?: Order[];
    syncWithUrl?: boolean;
    persistKey?: string;
  };

  // Additional TanStack Table options
  tableOptions?: Partial<TableOptions<T>>;

  // Enable row selection
  enableRowSelection?: boolean;

  // Enable multi-column sort
  enableMultiSort?: boolean;

  // Debounce delay for search input in milliseconds (default: 300)
  searchDebounceMs?: number;
}
```

#### Return Value

```typescript
interface UseCriteriaTableReturn<T> {
  // TanStack Table instance
  table: Table<T>;

  // Criteria state and methods
  criteria: UseCriteriaReturn<T>;

  // React Query result
  query: UseQueryResult<PaginatedResult<T>>;

  // Shortcut for query.data
  data?: PaginatedResult<T>;

  // Shortcut for query.isLoading
  isLoading: boolean;

  // Shortcut for query.error
  error: Error | null;

  // Props for Filter component
  filterProps: {
    fields: QueryFilter[];
    filters: Filter[];
    addOrReplaceByIndex: Function;
    removeFilter: Function;
    clearFilters: Function;
  };

  // Props for search integration
  searchProps: {
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    showSearch: boolean;
  };

  // Current sorting state
  sorting: SortingState;

  // Update sorting
  setSorting: (sorting: SortingState) => void;
}
```

### `DataTableCriteria<TData>`

Component for rendering server-side data tables with criteria.

#### Props

```typescript
interface DataTableCriteriaProps<TData> {
  // TanStack Table instance
  table: Table<TData>;

  // Loading state
  isLoading?: boolean;

  // Empty state message
  emptyMessage?: string;

  // Paginated result data
  data?: PaginatedResult<TData>;

  // Show column toggle button
  showColumnToggle?: boolean;

  // Search value (controlled)
  searchValue?: string;

  // Search change handler
  onSearchChange?: (value: string) => void;

  // Search input placeholder
  searchPlaceholder?: string;

  // Show search input
  showSearch?: boolean;
}
```

## Features

### ✅ Server-Side Everything

All filtering, sorting, and pagination happens on the server:

```tsx
const { table, data } = useCriteriaTable({
  queryFn: (criteria) => {
    // criteria contains all filters, sorting, pagination
    return api.getUsers(criteria);
  },
});
```

### ✅ URL Synchronization

Enable URL sync to persist table state in the URL:

```tsx
criteriaOptions: {
  syncWithUrl: true,
}
```

### ✅ LocalStorage Persistence

Persist table state across sessions:

```tsx
criteriaOptions: {
  persistKey: "users-table",
}
```

### ✅ Advanced Filtering

The Filter component supports:
- String, number, date, boolean types
- Multiple operators (equals, contains, greater than, etc.)
- Multi-select for options
- Between operator for ranges
- Nullable field support

```tsx
const filterFields: QueryFilter[] = [
  {
    type: "string",
    field: "status",
    fieldLabel: "Status",
    multiSelect: true,
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  },
  {
    type: "number",
    field: "age",
    fieldLabel: "Age",
  },
  {
    type: "date",
    field: "createdAt",
    fieldLabel: "Created At",
    isNullable: true,
  },
];
```

### ✅ Sortable Columns

Use `DataTableColumnHeader` for sortable columns:

```tsx
{
  accessorKey: "name",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Name" />
  ),
}
```

### ✅ Global Search

Built-in search functionality with automatic debouncing and URL sync:

```tsx
const { table, data, searchProps } = useCriteriaTable({
  // ... other options
  searchDebounceMs: 300, // Optional: default is 300ms
});

return (
  <DataTableCriteria
    table={table}
    data={data}
    searchPlaceholder="Search across all fields..."
    {...searchProps}
  />
);
```

The search value is automatically:
- **Debounced** (default 300ms) to avoid excessive API calls
- Synced with URL (if `syncWithUrl: true`)
- Persisted in localStorage (if `persistKey` is set)
- Sent to the server in the criteria

**How it works:**
- User types → Input updates immediately (no lag)
- After 300ms of no typing → Criteria updates → API call is made
- This prevents API spam while maintaining smooth UX

**Manual control:**

```tsx
const { criteria } = useCriteriaTable({ ... });

// Set search programmatically
criteria.setSearch("john");

// Clear search
criteria.clearSearch();

// Get current search value
const searchValue = criteria.search;
```

### ✅ TypeScript Type Safety

Full type inference throughout:

```tsx
const { table, criteria } = useCriteriaTable<User>({
  // TypeScript knows the shape of User
  columns,
  queryFn: getUsers, // Must return PaginatedResult<User>
});

// Fully typed
criteria.addFilter("name", "contains", "john");
```

## Examples

### Search with Custom Debounce

```tsx
// Faster response for local/cached data
const { searchProps } = useCriteriaTable({
  searchDebounceMs: 150,
  // ...
});

// Slower debounce for expensive API calls
const { searchProps } = useCriteriaTable({
  searchDebounceMs: 500,
  // ...
});

// No debounce (instant search)
const { searchProps } = useCriteriaTable({
  searchDebounceMs: 0,
  // ...
});
```

### Complete Example with All Features

```tsx
import { type ColumnDef } from "@tanstack/react-table";
import { useCriteriaTable } from "./hooks/use-criteria-table";
import { DataTableCriteria } from "./components/table/data-table-criteria";
import { Filter } from "./components/filter/filter";
import { DataTableColumnHeader } from "./components/table/data-table-column-header";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  createdAt: string;
}

const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product Name" />
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => {
      const price = row.getValue("price") as number;
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "inStock",
    header: "In Stock",
    cell: ({ row }) => {
      const inStock = row.getValue("inStock") as boolean;
      return inStock ? "✅ Yes" : "❌ No";
    },
  },
];

const filterFields: QueryFilter[] = [
  {
    type: "string",
    field: "name",
    fieldLabel: "Product Name",
  },
  {
    type: "number",
    field: "price",
    fieldLabel: "Price",
  },
  {
    type: "string",
    field: "category",
    fieldLabel: "Category",
    multiSelect: true,
    options: [
      { label: "Electronics", value: "electronics" },
      { label: "Clothing", value: "clothing" },
      { label: "Food", value: "food" },
    ],
  },
  {
    type: "boolean",
    field: "inStock",
    fieldLabel: "In Stock",
  },
  {
    type: "date",
    field: "createdAt",
    fieldLabel: "Created Date",
  },
];

export function ProductList() {
  const { table, data, isLoading, filterProps, searchProps, criteria } =
    useCriteriaTable<Product>({
      columns,
      filterFields,
      queryKey: ["products"],
      queryFn: getProducts,
      criteriaOptions: {
        pageSize: 25,
        syncWithUrl: true,
        persistKey: "product-table",
        initialSort: [{ field: "createdAt", direction: "desc" }],
      },
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products</h2>
        <button onClick={() => criteria.reset()}>Reset All</button>
      </div>

      <Filter {...filterProps} />

      <DataTableCriteria
        table={table}
        data={data}
        isLoading={isLoading}
        emptyMessage="No products found. Try adjusting your filters."
        searchPlaceholder="Search products by name, category..."
        {...searchProps}
      />
    </div>
  );
}
```

### Custom Query Function

```tsx
async function getProducts(
  criteria: Criteria<Product>
): Promise<PaginatedResult<Product>> {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(criteria.toJSON()),
  });

  const data = await response.json();
  return data;
}
```

## Architecture

```
┌─────────────────────────────────────────────┐
│           useCriteriaTable Hook             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │  useCriteria │  │   useQuery   │        │
│  │    (state)   │  │  (fetching)  │        │
│  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │
│         └────────┬────────┘                 │
│                  │                          │
│         ┌────────▼────────┐                 │
│         │ useReactTable   │                 │
│         │   (rendering)   │                 │
│         └─────────────────┘                 │
│                                             │
└─────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    ┌──────────┐         ┌─────────────┐
    │  Filter  │         │ DataTable   │
    │Component │         │  Criteria   │
    └──────────┘         └─────────────┘
```

## Best Practices

1. **Define columns outside component**: Prevents re-renders
2. **Use DataTableColumnHeader**: For sortable columns
3. **Enable URL sync**: Better user experience
4. **Use persistKey**: Remember user preferences
5. **Type your data**: Full TypeScript benefits
6. **Handle loading states**: Better UX during fetches
7. **Customize empty states**: Guide users when no results

## Migration from Old Pattern

**Before** (manual implementation):

```tsx
const criteria = useCriteria<User>({ syncWithUrl: true });
const { data } = useQuery({
  queryKey: ["users", criteria.toJSON()],
  queryFn: () => getUsers(criteria),
});

// Manual table setup...
const table = useReactTable({ ... });

return (
  <>
    <Filter {...manualProps} />
    <Table>...</Table>
    <Pagination>...</Pagination>
  </>
);
```

**After** (useCriteriaTable):

```tsx
const { table, data, isLoading, filterProps } = useCriteriaTable({
  columns,
  filterFields,
  queryKey: ["users"],
  queryFn: getUsers,
  criteriaOptions: { syncWithUrl: true },
});

return (
  <div className="space-y-4">
    <Filter {...filterProps} />
    <DataTableCriteria table={table} data={data} isLoading={isLoading} />
  </div>
);
```

## Troubleshooting

### Table not updating after filter change

Make sure your `queryFn` returns a `PaginatedResult`:

```tsx
// ❌ Wrong
queryFn: async () => {
  const data = await fetch("/api/users");
  return data.json(); // Plain array
};

// ✅ Correct
queryFn: async (criteria) => {
  const data = await fetch("/api/users", {
    body: JSON.stringify(criteria.toJSON()),
  });
  return data.json(); // PaginatedResult<User>
};
```

### Filters not showing

Make sure you pass `filterFields`:

```tsx
useCriteriaTable({
  filterFields: userFilterFields, // Don't forget this!
  // ...
});
```

### TypeScript errors

Ensure your types match:

```tsx
// Criteria type must match query function type
useCriteriaTable<User>({
  queryFn: (criteria: Criteria<User>) => getUsers(criteria),
});
```
