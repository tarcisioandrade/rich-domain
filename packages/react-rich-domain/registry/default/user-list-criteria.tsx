import { type ColumnDef } from "@tanstack/react-table";
import { getUsers, type TestUser } from "./service/get-users";
import { useCriteriaTable } from "./hooks/use-criteria-table";
import { DataTableCriteria } from "./components/table/data-table-criteria";
import { Filter } from "./components/filter/filter";
import type { QueryFilter } from "./lib/filter-utils";
import { cn } from "./lib/utils";
import { DataTableColumnHeader } from "./components/table/data-table-column-header";
import { Button } from "./components/ui/button";

const filterFields: QueryFilter[] = [
  {
    type: "number",
    field: "age",
    fieldLabel: "Age",
  },
  {
    type: "string",
    field: "name",
    fieldLabel: "Name",
  },
  {
    type: "string",
    field: "status",
    fieldLabel: "Status",
    multiSelect: true,
    options: [
      {
        label: "Active",
        value: "active",
      },
      {
        label: "Inactive",
        value: "inactive",
      },
    ],
  },
];

const columns: ColumnDef<TestUser>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "age",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Age" />
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <span
          className={cn(
            status === "active" ? "text-green-500" : "text-red-500",
            "font-medium"
          )}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    },
  },
];

export function UserList() {
  const { table, data, isLoading, filterProps, searchProps } =
    useCriteriaTable<TestUser>({
      columns,
      filterFields,
      queryKey: ["users"],
      queryFn: getUsers,
      criteriaOptions: {
        pageSize: 10,
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
        actionBar={
          <Button size="sm" className="h-8">
            Add User
          </Button>
        }
        emptyMessage="No users found."
        searchPlaceholder="Search users..."
        {...searchProps}
      />
    </div>
  );
}
