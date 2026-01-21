# React Components

## DataTableCriteria

Full-featured data table with filtering, searching, pagination, and column visibility.

```typescript
import { DataTableCriteria } from "@woltz/react-rich-domain";

<DataTableCriteria
  table={table}                    // TanStack Table instance
  data={query.data}                // PaginatedResult<T>
  isLoading={query.isLoading}

  // Filtering
  filterProps={filterProps}        // From useCriteriaTable

  // Search
  searchValue={criteria.search}
  onSearchChange={criteria.setSearch}
  showSearch={true}

  // Features
  showColumnToggle={true}
  emptyMessage="No results found"

  // Custom toolbar
  actionBar={
    <Button onClick={handleCreate}>
      Add New
    </Button>
  }

  // Export
  onExport={async (format) => {
    const url = await exportData(format);
    return url;
  }}
/>
```

### Table Column Definition

```typescript
import { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "active" ? "success" : "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuItem onClick={() => edit(row.original)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => delete(row.original.id)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenu>
    ),
  },
];
```

---

## DataKanbanCriteria

Kanban board with drag-and-drop, virtualization, and infinite scroll per column.

```typescript
import { DataKanbanCriteria } from "@woltz/react-rich-domain";

<DataKanbanCriteria
  kanban={kanban}                  // From useCriteriaKanban

  // Card rendering
  renderCard={(item, isDragging, isClickable) => (
    <Card className={isDragging ? "opacity-50 rotate-3" : ""}>
      <CardHeader>{item.title}</CardHeader>
      <CardContent>{item.description}</CardContent>
    </Card>
  )}

  // Column customization
  renderColumnHeader={(column, itemCount) => (
    <div className="flex items-center gap-2">
      <h3>{column.title}</h3>
      <Badge>{itemCount}</Badge>
      {column.limit && itemCount >= column.limit && (
        <Badge variant="destructive">Limit reached</Badge>
      )}
    </div>
  )}

  renderColumnFooter={(column) => (
    <Button variant="ghost" onClick={() => addCard(column.id)}>
      + Add Card
    </Button>
  )}

  renderEmptyState={(column) => (
    <div className="text-muted-foreground text-center py-8">
      No items in {column.title}
    </div>
  )}

  // Layout
  toolbarLayout="default"          // "default" | "compact" | "none"
  showItemCount={true}
  showSkeleton={true}

  // Virtualization
  estimatedCardHeight={120}

  // Interaction
  onCardClick={(item) => openDetail(item)}

  // Custom toolbar
  actionBar={
    <Button onClick={handleCreate}>
      New Task
    </Button>
  }

  // Styling
  className="h-full"
  columnsClassName="gap-4"
  columnClassName="bg-muted rounded-lg"
/>
```

### Kanban Card States

```typescript
renderCard={(item, isDragging, isClickable) => {
  // isDragging: true when card is being dragged
  // isClickable: true when onCardClick is provided

  return (
    <div
      className={cn(
        "p-4 bg-white rounded shadow",
        isDragging && "opacity-50 rotate-2 shadow-lg",
        isClickable && "cursor-pointer hover:shadow-md"
      )}
    >
      {item.title}
    </div>
  );
}}
```

---

## DataTimelineCriteria

Timeline view with grouped items and infinite scroll.

```typescript
import { DataTimelineCriteria } from "@woltz/react-rich-domain";

<DataTimelineCriteria
  timeline={timeline}              // From useCriteriaTimeline

  // Event rendering
  renderEvent={(item) => (
    <div className="flex items-start gap-4">
      <Avatar src={item.user.avatar} />
      <div>
        <p className="font-medium">{item.user.name}</p>
        <p className="text-muted-foreground">{item.description}</p>
        <time className="text-sm text-muted-foreground">
          {formatTime(item.createdAt)}
        </time>
      </div>
    </div>
  )}

  // Group header customization
  renderGroupHeader={(group) => (
    <div className="sticky top-0 bg-background py-2">
      <h3 className="text-lg font-semibold">{group.label}</h3>
      <p className="text-sm text-muted-foreground">
        {group.items.length} items
      </p>
    </div>
  )}

  // Empty state
  emptyMessage="No activity yet"

  // Loading
  showSkeleton={true}
/>
```

---

## DataViewToolbar

Standalone toolbar with search, filter, and export controls.

```typescript
import { DataViewToolbar } from "@woltz/react-rich-domain";

<DataViewToolbar
  // Search
  searchValue={criteria.search}
  onSearchChange={criteria.setSearch}
  searchPlaceholder="Search users..."

  // Filter
  filterProps={filterProps}

  // Export
  onExport={async (format) => {
    const blob = await exportToFormat(format);
    return URL.createObjectURL(blob);
  }}
  exportFormats={["csv", "json", "xlsx"]}

  // Custom actions
  actionBar={
    <>
      <Button variant="outline" onClick={refresh}>
        Refresh
      </Button>
      <Button onClick={create}>
        Add New
      </Button>
    </>
  }
/>
```

---

## DataViewFilter

Filter dropdown with add/remove filter UI.

```typescript
import { DataViewFilter } from "@woltz/react-rich-domain";

<DataViewFilter
  filters={criteria.filters}
  filterFields={filterFields}
  onAddFilter={(field, operator, value) => {
    criteria.addFilter(field, operator, value);
  }}
  onRemoveFilter={(index) => {
    criteria.removeFilter(index);
  }}
  onClearFilters={() => {
    criteria.clearFilters();
  }}
/>
```

---

## Complete Example: User Management

```typescript
import {
  useCriteriaTable,
  DataTableCriteria,
  QueryFilter,
} from "@woltz/react-rich-domain";
import { ColumnDef } from "@tanstack/react-table";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
  status: "active" | "inactive";
  createdAt: string;
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar name={row.original.name} />
        <span>{row.original.name}</span>
      </div>
    ),
  },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <Badge>{row.original.role}</Badge>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "active" ? "success" : "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editUser(row.original)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => deleteUser(row.original.id)}
            className="text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

const filterFields: QueryFilter[] = [
  {
    field: "role",
    type: "string",
    fieldLabel: "Role",
    options: [
      { label: "Admin", value: "admin" },
      { label: "User", value: "user" },
      { label: "Guest", value: "guest" },
    ],
  },
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
];

export function UserManagement() {
  const { table, filterProps, searchProps, query } = useCriteriaTable({
    columns,
    queryKey: ["users"],
    queryFn: async (criteria) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria.toJSON()),
      });
      return res.json();
    },
    filterFields,
    pageSize: 20,
    syncWithUrl: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      <DataTableCriteria
        table={table}
        data={query.data}
        isLoading={query.isLoading}
        filterProps={filterProps}
        {...searchProps}
        showColumnToggle
        actionBar={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        }
        onExport={async (format) => {
          const url = await exportUsers(format, query.data);
          return url;
        }}
      />
    </div>
  );
}
```
