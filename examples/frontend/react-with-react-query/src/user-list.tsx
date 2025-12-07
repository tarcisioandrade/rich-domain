import { DataTableCriteria } from "./components/data-table-criteria/data-table-criteria";
import { useCriteriaTable } from "./hooks/use-criteria-table";
import type { QueryFilter } from "./lib/filter-utils";
import { getUsers, type TestUser } from "./service/get-users";
import { type ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<TestUser>[] = [
  {
    accessorKey: "name",
    header: "Name",
    enableSorting: true,
  },
  {
    accessorKey: "age",
    header: "Age",
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
  },
];

const queryFilters: QueryFilter[] = [
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

export function UserList() {
  const { table, isLoading, query, searchProps, filterProps } =
    useCriteriaTable<TestUser>({
      columns,
      queryFn: getUsers,
      queryKey: ["users"],
      filterFields: queryFilters,
      criteriaOptions: {
        pageSize: 10,
        syncWithUrl: true,
      },
    });

  return (
    <section className="container mx-auto mt-10">
      <DataTableCriteria
        table={table}
        isLoading={isLoading}
        data={query.data}
        filterProps={filterProps}
        {...searchProps}
      />
    </section>
  );
}
