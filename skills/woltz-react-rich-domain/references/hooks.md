# React Hooks

## useCriteria<T>

Core hook for managing filter, sort, and pagination state.

```typescript
import { useCriteria } from "@woltz/react-rich-domain";

const criteria = useCriteria<User>({
  initialPage: 1,
  pageSize: 20,
  initialFilters: [],
  initialSort: [],
  initialSearch: "",
  onChange: (criteria) => console.log(criteria),
  persistKey: "userList", // localStorage key
  syncWithUrl: true, // URL query params sync
});
```

### Methods

```typescript
// Filters
criteria.addFilter("status", "equals", "active");
criteria.addFilter("age", "greaterThan", 18, { replace: true });
criteria.removeFilter(0);
criteria.removeFilterByField("status");
criteria.clearFilters();

// Sorting
criteria.addSort("createdAt", "desc");
criteria.removeSort(0);
criteria.clearSort();

// Pagination
criteria.setPage(2);
criteria.setPageSize(50);

// Search
criteria.setSearch("john");
criteria.clearSearch();

// Reset
criteria.reset(); // Reset to initial values
criteria.clearAll(); // Clear everything

// Export
const json = criteria.toJSON();
const copy = criteria.clone();
```

### Getters

```typescript
criteria.filters; // Filter[]
criteria.orders; // Order[]
criteria.page; // number
criteria.pageSize; // number
criteria.search; // string | undefined
criteria.hasFilters; // boolean
criteria.hasOrders; // boolean
criteria.hasSearch; // boolean
```

---

## useCriteriaQuery<TData>

Combines `useCriteria` with React Query for paginated data fetching.

```typescript
import { useCriteriaQuery } from "@woltz/react-rich-domain";

const {
  // Query state
  data,
  isLoading,
  isFetching,
  isError,
  error,
  refetch,
  meta, // { page, limit, total, totalPages }

  // Criteria methods
  addFilter,
  removeFilter,
  setPage,
  setSearch,
  // ... all useCriteria methods
} = useCriteriaQuery(
  ["users"],
  async (criteria) => {
    const res = await fetch("/api/users", {
      method: "POST",
      body: JSON.stringify(criteria.toJSON()),
    });
    return res.json(); // Must return { data: T[], meta: {...} }
  },
  {
    pageSize: 20,
    staleTime: 5 * 60 * 1000,
    syncWithUrl: true,
  }
);
```

### Expected Response Format

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## useCriteriaInfiniteQuery<TData>

For infinite scroll scenarios.

```typescript
import { useCriteriaInfiniteQuery } from "@woltz/react-rich-domain";

const {
  data,              // T[] - flattened array of all items
  pages,             // All loaded pages
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,

  // Criteria methods
  addFilter,
  setSearch,
  // ...
} = useCriteriaInfiniteQuery(
  ["users"],
  async (criteria) => fetchUsers(criteria),
  { pageSize: 20 }
);

// Usage
<div onScroll={handleScroll}>
  {data.map(user => <UserCard key={user.id} user={user} />)}
  {hasNextPage && (
    <button onClick={() => fetchNextPage()}>
      Load More
    </button>
  )}
</div>
```

---

## useCriteriaTable<TData>

Integrates TanStack React Table with Criteria.

```typescript
import { useCriteriaTable } from "@woltz/react-rich-domain";
import { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge>{row.original.status}</Badge>,
  },
];

const {
  table,           // TanStack Table instance
  criteria,        // Criteria state
  query,           // React Query result

  // Integration props
  filterProps,     // Pass to DataViewFilter
  searchProps,     // { searchValue, onSearchChange }

  // Sorting state
  sorting,
  setSorting,
} = useCriteriaTable({
  columns,
  queryKey: ["users"],
  queryFn: async (criteria) => fetchUsers(criteria),
  filterFields: [
    {
      field: "status",
      type: "string",
      fieldLabel: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    {
      field: "createdAt",
      type: "date",
      fieldLabel: "Created Date",
    },
  ],
  pageSize: 20,
  syncWithUrl: true,
});
```

---

## useCriteriaKanban<TData>

Advanced Kanban board with drag-and-drop.

```typescript
import {
  useCriteriaKanban,
  KanbanColumnDefinition,
} from "@woltz/react-rich-domain";

interface Task {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  order: string;
}

const columns: KanbanColumnDefinition<Task>[] = [
  {
    id: "todo",
    title: "To Do",
    criteria: (c) => c.where("status", "equals", "todo"),
    limit: 10, // WIP limit (optional)
  },
  {
    id: "doing",
    title: "In Progress",
    criteria: (c) => c.where("status", "equals", "doing"),
    limit: 5,
  },
  {
    id: "done",
    title: "Done",
    criteria: (c) => c.where("status", "equals", "done"),
  },
];

const kanban = useCriteriaKanban<Task>("tasks", fetchTasks, {
  columns,
  getItemId: (task) => task.id,
  groupField: "status",

  // Called when card is moved
  onCardMove: async ({ cardId, fromColumn, toColumn, insertAfterId }) => {
    await updateTask(cardId, {
      status: toColumn.id,
      insertAfter: insertAfterId, // For ordering
    });
  },

  // Options
  enableDragDrop: true,
  columnPageSize: 50,
  searchDebounceMs: 300,

  // Filter fields (optional)
  filterFields: [{ field: "priority", type: "string", fieldLabel: "Priority" }],
});
```

### Kanban Return Values

```typescript
const {
  // Column data
  columns, // KanbanColumnData[] with items and loading state
  getColumn, // (id) => KanbanColumnData
  getColumnItems, // (id) => T[]

  // Card operations
  moveCard, // (cardId, fromColId, toColId, index) => void
  moveMutation, // Mutation result

  // Filters
  filterProps,
  searchProps,

  // DnD
  dndContextProps, // Pass to DndContext

  // State
  isLoading,
} = kanban;
```

---

## useCriteriaTimeline<TData>

Timeline view with automatic date grouping.

```typescript
import { useCriteriaTimeline } from "@woltz/react-rich-domain";

interface Activity {
  id: string;
  description: string;
  createdAt: Date;
  type: string;
}

const timeline = useCriteriaTimeline(
  ["activities"],
  async (criteria) => fetchActivities(criteria),
  {
    dateField: "createdAt",
    groupBy: "day", // "hour" | "day" | "week" | "month" | "year"
    sortDirection: "desc",
    filterFields: [{ field: "type", type: "string", fieldLabel: "Type" }],
  }
);
```

### Timeline Return Values

```typescript
const {
  // Grouped data
  groupedData, // TimelineGroup<T>[] with relative labels
  data, // Raw ungrouped data

  // Infinite scroll
  loadMore,
  hasMore,
  isLoadingMore,

  // Criteria
  filterProps,
  searchProps,
  addFilter,
  setSearch,
  // ...
} = timeline;

// TimelineGroup structure
interface TimelineGroup<T> {
  label: string; // "Today", "Yesterday", "Last Week", etc.
  date: Date;
  items: T[];
}
```
