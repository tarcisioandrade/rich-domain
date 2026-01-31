import { type ColumnDef } from "@tanstack/react-table";
import { getUsers, type TestUser } from "./service/get-users";
import { useCriteriaTable } from "./hooks/use-criteria-table";
import { DataTableCriteria } from "./components/data-table-criteria/data-table-criteria";
import type { QueryFilter } from "./lib/filter-utils";
import { cn } from "./lib/utils";
import { DataTableColumnHeader } from "./components/data-table-criteria/data-table-column-header";

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
  const { table, criteria } = useCriteriaTable<TestUser>({
    filterFields,
    columns,
    queryKey: ["users"],
    queryFn: getUsers,
    searchOptions: {
      searchPlaceholder: "Search users...",
    },
    criteriaOptions: {
      pageSize: 10,
      syncWithUrl: true,
    },
  });

  return <DataTableCriteria table={table} criteria={criteria} />;
}
