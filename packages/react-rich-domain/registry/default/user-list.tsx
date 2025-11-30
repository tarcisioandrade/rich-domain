import { getUsers, type TestUser } from "./service/get-users";
import { useQuery } from "@tanstack/react-query";
import { useCriteria } from "./hooks/use-criteria";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "./components/ui/pagination";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import type { QueryFilter } from "./lib/filter-utils";
import { Filter } from "./components/filter/filter";

const QueryFilter: QueryFilter[] = [
  {
    type: "number",
    field: "age",
    fieldLabel: "Idade",
  },
  {
    type: "string",
    field: "name",
    fieldLabel: "Nome",
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

export function UserList() {
  const {
    criteria,
    prevPage,
    addOrReplaceByIndex,
    nextPage,
    filters,
    removeFilter,
    clearFilters,
  } = useCriteria<TestUser>({
    syncWithUrl: true,
  });

  const { data } = useQuery({
    queryKey: ["users", criteria.toJSON()],
    queryFn: () => getUsers(criteria),
  });

  return (
    <section className="container mx-auto mt-10">
      <Filter
        fields={QueryFilter}
        addOrReplaceByIndex={addOrReplaceByIndex}
        removeFilter={removeFilter}
        filters={filters}
        clearFilters={clearFilters}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.data?.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.age}</TableCell>
              <TableCell
                className={cn(
                  user.status === "active" ? "text-green-500" : "text-red-500"
                )}
              >
                {user.status}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button disabled={!data?.meta.hasPrevious} onClick={prevPage}>
              Previous
            </Button>
          </PaginationItem>
          <Button disabled={!data?.meta.hasNext} onClick={nextPage}>
            Next
          </Button>
        </PaginationContent>
      </Pagination>
    </section>
  );
}
