import { getUsers, type TestUser } from "@/service/get-users";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { useQuery } from "@tanstack/react-query";
import { DataTableColumnHeader } from "./data-table-column-header";

export const columns: ColumnDef<TestUser>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },
  {
    header: "Age",
    accessorKey: "age",
  },
  {
    header: "Status",
    accessorKey: "status",
  },
];

export function TableExample() {
  const { data: result } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  const data = result?.data ?? [];

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  );
}
