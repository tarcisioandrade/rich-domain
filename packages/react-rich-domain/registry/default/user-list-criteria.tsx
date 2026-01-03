import { type ColumnDef } from "@tanstack/react-table";
import { getUsers, type TestUser } from "./service/get-users";
import { useCriteriaTable } from "./hooks/use-criteria-table";
import { DataTableCriteria } from "./components/data-table-criteria/data-table-criteria";
import type { QueryFilter } from "./lib/filter-utils";
import { cn } from "./lib/utils";
import { DataTableColumnHeader } from "./components/data-table-criteria/data-table-column-header";
import { Button } from "./components/ui/button";
import { exportUsersToCSV } from "./service/get-users-from-api";
import { Criteria } from "@woltz/rich-domain";

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

export function UserListCriteria() {
  const { table, data, isLoading, filterProps, searchProps } =
    useCriteriaTable<TestUser>({
      filterFields,
      columns,
      queryKey: ["users"],
      queryFn: getUsers,
      criteriaOptions: {
        pageSize: 10,
        syncWithUrl: true,
      },
    });

  return (
    <div className="space-y-4">
      <DataTableCriteria
        onExport={async () => {
          const csv = await exportUsersToCSV(Criteria.create<TestUser>());
          return csv;
        }}
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
        filterProps={filterProps}
        {...searchProps}
      />
    </div>
  );
}
