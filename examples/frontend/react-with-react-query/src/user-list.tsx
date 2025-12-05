import { getUsers, type TestUser } from "./service/get-users";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { XIcon } from "lucide-react";

export function UserList() {
  const {
    criteria,
    filters,
    sorting,
    removeFilterByField,
    removeSortByField,
    search,
    addFilter,
    clearFilters,
    addSort,
    getSortByField,
    nextPage,
    prevPage,
    setSearch,
    getFilterByField,
    clearSearch,
  } = useCriteria<TestUser>({
    pageSize: 10,
    initialFilters: [{ field: "status", operator: "equals", value: "active" }],
    syncWithUrl: true,
  });

  const { data } = useQuery({
    queryKey: ["users", criteria.toJSON()],
    queryFn: () => getUsers(criteria),
  });

  const [searchValue, setSearchValue] = useState<string | undefined>(
    search ?? ""
  );

  const handleSearch = (searchValue: string) => {
    setSearchValue(searchValue);
    if (searchValue.trim()) {
      setSearch(searchValue);
    } else {
      clearSearch();
    }
  };

  const defaultStatusFilter = getFilterByField("status");
  const defaultAgeSort = getSortByField("age")?.direction;

  return (
    <section className="max-w-lg mx-auto mt-10">
      <div className="flex justify-between items-center gap-2 mb-10">
        <div className="flex justify-between items-center gap-2">
          <Select
            onValueChange={(value: "active" | "inactive") => {
              addFilter("status", "equals", value);
            }}
            value={defaultStatusFilter?.value as string | undefined}
          >
            <SelectTrigger>
              <SelectValue placeholder="Active Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value: "asc" | "desc") => {
              addSort("age", value);
            }}
            defaultValue={defaultAgeSort}
          >
            <SelectTrigger>
              <SelectValue placeholder="Order by Age" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Asc</SelectItem>
              <SelectItem value="desc">Desc</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          type="text"
          placeholder="Search"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {filters.length > 0 && (
          <Button variant="secondary" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        )}
      </div>
      {/* Filters with remove button */}
      <div className="mb-6">
        <div>
          {filters.map((filter, index: number) => (
            <div key={index}>
              <span className="font-bold">{filter.field}</span>{" "}
              <span className="font-medium text-green-500">
                {filter.operator}
              </span>{" "}
              <span className="font-medium text-blue-500">
                {filter.value as string}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFilterByField("status")}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <div>
          {sorting.map((sort, index: number) => (
            <div key={index}>
              <span className="font-bold">{sort.field}</span>{" "}
              <span className="font-medium text-green-500">
                {sort.direction}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSortByField("age")}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
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
