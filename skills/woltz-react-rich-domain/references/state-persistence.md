# State Persistence

## URL Query Params Sync

Sync criteria state with URL for shareable links and browser navigation.

```typescript
const criteria = useCriteria<User>({
  syncWithUrl: true,
});

// URL automatically updates:
// /users?page=2&limit=20&filters=status:equals:active&sort=-createdAt&search=john
```

### URL Format

```
?page=1
&limit=20
&filters=status:equals:active,age:greaterThan:18
&sort=name,-createdAt    // - prefix = descending
&search=john
```

### With useCriteriaTable

```typescript
const { table, criteria } = useCriteriaTable({
  columns,
  queryKey: ["users"],
  queryFn: fetchUsers,
  filterFields,
  syncWithUrl: true, // Enable URL sync
});

// Navigating to /users?filters=status:equals:active
// will automatically apply the filter
```

---

## localStorage Persistence

Persist criteria state across page refreshes.

```typescript
const criteria = useCriteria<User>({
  persistKey: "userListCriteria", // localStorage key
});

// State is saved to localStorage on every change
// and restored on component mount
```

### Combining URL and localStorage

```typescript
const criteria = useCriteria<User>({
  syncWithUrl: true,
  persistKey: "userListCriteria",
});

// Priority:
// 1. URL params (if present)
// 2. localStorage (if URL is empty)
// 3. Initial values (fallback)
```

---

## Custom Persistence

Implement custom persistence logic:

```typescript
const criteria = useCriteria<User>({
  onChange: (criteriaState) => {
    // Save to custom storage
    sessionStorage.setItem("criteria", JSON.stringify(criteriaState.toJSON()));

    // Or send to analytics
    analytics.track("filter_changed", {
      filters: criteriaState.filters,
      search: criteriaState.search,
    });
  },
});

// Restore on mount
useEffect(() => {
  const saved = sessionStorage.getItem("criteria");
  if (saved) {
    const parsed = JSON.parse(saved);
    // Apply saved state
    parsed.filters.forEach((f) =>
      criteria.addFilter(f.field, f.operator, f.value)
    );
    if (parsed.search) criteria.setSearch(parsed.search);
  }
}, []);
```

---

## Serialization

### To JSON

```typescript
const json = criteria.toJSON();
// {
//   filters: [{ field: "status", operator: "equals", value: "active" }],
//   orders: [{ field: "createdAt", direction: "desc" }],
//   pagination: { page: 1, limit: 20 },
//   search: "john"
// }

// Send to API
fetch("/api/users", {
  method: "POST",
  body: JSON.stringify(json),
});
```

### To Query String

```typescript
const queryString = criteria.toQueryString();
// "page=1&limit=20&filters=status:equals:active&sort=-createdAt&search=john"

fetch(`/api/users?${queryString}`);
```

### Clone

```typescript
const copy = criteria.clone();
// Create independent copy for comparison or branching
```

---

## Saved Filters / Views

Implement saved filter presets:

```typescript
interface SavedView {
  id: string;
  name: string;
  criteria: CriteriaJSON;
}

function FilterViews({ criteria, savedViews, onSave }) {
  const applyView = (view: SavedView) => {
    criteria.clearAll();
    const parsed = view.criteria;
    parsed.filters.forEach(f => criteria.addFilter(f.field, f.operator, f.value));
    parsed.orders.forEach(o => criteria.addSort(o.field, o.direction));
    if (parsed.search) criteria.setSearch(parsed.search);
    if (parsed.pagination) {
      criteria.setPage(parsed.pagination.page);
      criteria.setPageSize(parsed.pagination.limit);
    }
  };

  const saveCurrentView = () => {
    const name = prompt("View name:");
    if (name) {
      onSave({
        id: crypto.randomUUID(),
        name,
        criteria: criteria.toJSON(),
      });
    }
  };

  return (
    <div className="flex gap-2">
      {savedViews.map(view => (
        <Button
          key={view.id}
          variant="outline"
          onClick={() => applyView(view)}
        >
          {view.name}
        </Button>
      ))}
      <Button variant="ghost" onClick={saveCurrentView}>
        Save Current View
      </Button>
    </div>
  );
}
```

---

## Deep Linking

Share specific filtered views:

```typescript
function ShareButton({ criteria }) {
  const copyLink = () => {
    const url = new URL(window.location.href);
    url.search = criteria.toQueryString();
    navigator.clipboard.writeText(url.toString());
    toast.success("Link copied!");
  };

  return (
    <Button variant="outline" onClick={copyLink}>
      <Share className="h-4 w-4 mr-2" />
      Share View
    </Button>
  );
}

// Shared link example:
// https://app.com/tasks?filters=status:equals:todo,priority:in:high,medium&sort=-dueDate
```

---

## Reset and Clear

```typescript
// Reset to initial values (keeps initialFilters, initialSort, etc.)
criteria.reset();

// Clear everything (empty state)
criteria.clearAll();

// Clear specific parts
criteria.clearFilters();
criteria.clearSort();
criteria.clearSearch();
```

---

## React Router Integration

```typescript
import { useSearchParams } from "react-router-dom";

function useUrlCriteria<T>() {
  const [searchParams, setSearchParams] = useSearchParams();

  const criteria = useCriteria<T>({
    // Don't use built-in syncWithUrl, handle manually
    onChange: (state) => {
      const params = new URLSearchParams();
      // ... convert state to params
      setSearchParams(params, { replace: true });
    },
  });

  // Sync from URL on mount
  useEffect(() => {
    const filters = searchParams.get("filters");
    // ... parse and apply
  }, []);

  return criteria;
}
```

---

## Complete Persistence Example

```typescript
import { useCriteriaTable, DataTableCriteria } from "@woltz/react-rich-domain";

export function UserList() {
  const { table, filterProps, searchProps, criteria, query } = useCriteriaTable({
    columns,
    queryKey: ["users"],
    queryFn: fetchUsers,
    filterFields,

    // Enable both persistence methods
    syncWithUrl: true,
    persistKey: "userListCriteria",

    // Initial defaults (used when no saved state)
    pageSize: 20,
    initialSort: [{ field: "createdAt", direction: "desc" }],
  });

  return (
    <div className="space-y-4">
      {/* Saved views */}
      <FilterViews
        criteria={criteria}
        savedViews={savedViews}
        onSave={handleSaveView}
      />

      {/* Share button */}
      <ShareButton criteria={criteria} />

      {/* Table */}
      <DataTableCriteria
        table={table}
        data={query.data}
        isLoading={query.isLoading}
        filterProps={filterProps}
        {...searchProps}
      />

      {/* Reset button */}
      {(criteria.hasFilters || criteria.hasSearch) && (
        <Button variant="ghost" onClick={() => criteria.clearAll()}>
          Clear All Filters
        </Button>
      )}
    </div>
  );
}
```
