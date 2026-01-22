# Filtering

## Filter Field Definition

```typescript
type QueryFilter = {
  field: string;                    // Field path (e.g., "status", "user.name")
  type: "string" | "number" | "boolean" | "date";
  fieldLabel: string;               // Display label
  isNullable?: boolean;             // Allow isNull/isNotNull operators
  multiSelect?: boolean;            // Allow multiple values for "in" operator
  options?: FilterOption[];         // Predefined options for select
};

type FilterOption = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};
```

## Operators by Type

### String Operators

```typescript
{
  field: "name",
  type: "string",
  fieldLabel: "Name",
}

// Available operators:
// equals, notEquals, contains, startsWith, endsWith, in, notIn, isNull, isNotNull
```

### Number Operators

```typescript
{
  field: "age",
  type: "number",
  fieldLabel: "Age",
}

// Available operators:
// equals, notEquals, greaterThan, greaterThanOrEqual,
// lessThan, lessThanOrEqual, between, in, notIn, isNull, isNotNull
```

### Date Operators

```typescript
{
  field: "createdAt",
  type: "date",
  fieldLabel: "Created Date",
}

// Available operators:
// equals, notEquals, greaterThan, greaterThanOrEqual,
// lessThan, lessThanOrEqual, between, isNull, isNotNull
```

### Boolean Operators

```typescript
{
  field: "isActive",
  type: "boolean",
  fieldLabel: "Active",
}

// Available operators:
// equals, notEquals, isNull, isNotNull
```

## Filter with Predefined Options

```typescript
const filterFields: QueryFilter[] = [
  {
    field: "status",
    type: "string",
    fieldLabel: "Status",
    options: [
      { label: "Active", value: "active", icon: <CheckCircle /> },
      { label: "Inactive", value: "inactive", icon: <XCircle /> },
      { label: "Pending", value: "pending", icon: <Clock /> },
    ],
  },
  {
    field: "priority",
    type: "string",
    fieldLabel: "Priority",
    multiSelect: true,  // Allow selecting multiple values
    options: [
      { label: "High", value: "high" },
      { label: "Medium", value: "medium" },
      { label: "Low", value: "low" },
    ],
  },
];
```

## Nullable Fields

```typescript
{
  field: "deletedAt",
  type: "date",
  fieldLabel: "Deleted Date",
  isNullable: true,  // Enables isNull/isNotNull operators
}

// User can filter:
// - deletedAt isNull (not deleted)
// - deletedAt isNotNull (deleted)
```

## Programmatic Filter Management

```typescript
const { addFilter, removeFilter, clearFilters, filters } = useCriteria();

// Add filter
addFilter("status", "equals", "active");
addFilter("age", "greaterThan", 18);
addFilter("tags", "in", ["featured", "popular"]);
addFilter("createdAt", "between", [startDate, endDate]);

// Add filter with options
addFilter("status", "equals", "active", { replace: true }); // Replace existing

// Remove filter
removeFilter(0);                    // By index
removeFilterByField("status");      // By field name

// Clear all
clearFilters();

// Read filters
console.log(filters);
// [
//   { field: "status", operator: "equals", value: "active" },
//   { field: "age", operator: "greaterThan", value: 18 }
// ]
```

## Filter UI Components

### DataViewFilter

Dropdown with filter management:

```typescript
import { DataViewFilter } from "@woltz/react-rich-domain";

<DataViewFilter
  filters={criteria.filters}
  filterFields={filterFields}
  onAddFilter={criteria.addFilter}
  onRemoveFilter={criteria.removeFilter}
  onClearFilters={criteria.clearFilters}
/>
```

### Using filterProps from Hooks

```typescript
const { filterProps } = useCriteriaTable({
  filterFields: [...],
  // ...
});

// filterProps contains all necessary props
<DataViewFilter {...filterProps} />
```

## Complete Filter Example

```typescript
import { useCriteriaTable, DataTableCriteria, QueryFilter } from "@woltz/react-rich-domain";

interface Task {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  priority: "high" | "medium" | "low";
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
}

const filterFields: QueryFilter[] = [
  {
    field: "status",
    type: "string",
    fieldLabel: "Status",
    options: [
      { label: "To Do", value: "todo" },
      { label: "In Progress", value: "doing" },
      { label: "Done", value: "done" },
    ],
  },
  {
    field: "priority",
    type: "string",
    fieldLabel: "Priority",
    multiSelect: true,
    options: [
      { label: "High", value: "high", icon: <ArrowUp className="text-red-500" /> },
      { label: "Medium", value: "medium", icon: <ArrowRight className="text-yellow-500" /> },
      { label: "Low", value: "low", icon: <ArrowDown className="text-green-500" /> },
    ],
  },
  {
    field: "assigneeId",
    type: "string",
    fieldLabel: "Assignee",
    isNullable: true,  // Can filter unassigned tasks
  },
  {
    field: "dueDate",
    type: "date",
    fieldLabel: "Due Date",
    isNullable: true,
  },
  {
    field: "createdAt",
    type: "date",
    fieldLabel: "Created",
  },
];

export function TaskList() {
  const { table, filterProps, searchProps, criteria } = useCriteriaTable({
    columns,
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    filterFields,
    syncWithUrl: true,
  });

  return (
    <div className="space-y-4">
      {/* Quick filter buttons */}
      <div className="flex gap-2">
        <Button
          variant={criteria.hasFilter("status", "todo") ? "default" : "outline"}
          onClick={() => criteria.addFilter("status", "equals", "todo", { replace: true })}
        >
          To Do
        </Button>
        <Button
          variant={criteria.hasFilter("assigneeId", null) ? "default" : "outline"}
          onClick={() => criteria.addFilter("assigneeId", "isNull", true)}
        >
          Unassigned
        </Button>
        <Button
          variant="ghost"
          onClick={() => criteria.clearFilters()}
        >
          Clear Filters
        </Button>
      </div>

      {/* Active filters display */}
      {criteria.hasFilters && (
        <div className="flex flex-wrap gap-2">
          {criteria.filters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {filter.field}: {filter.operator} {String(filter.value)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => criteria.removeFilter(index)}
              />
            </Badge>
          ))}
        </div>
      )}

      <DataTableCriteria
        table={table}
        filterProps={filterProps}
        {...searchProps}
      />
    </div>
  );
}
```

## Backend Filter Handling

The frontend sends filters as JSON:

```typescript
// Frontend sends:
{
  filters: [
    { field: "status", operator: "equals", value: "active" },
    { field: "age", operator: "greaterThan", value: 18 }
  ],
  orders: [{ field: "createdAt", direction: "desc" }],
  pagination: { page: 1, limit: 20 },
  search: "john"
}

// Backend converts to Criteria:
const criteria = Criteria.fromObject(requestBody);
const result = await repository.find(criteria);
```
