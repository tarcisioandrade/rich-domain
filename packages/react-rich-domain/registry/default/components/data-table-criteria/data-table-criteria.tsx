"use client";

import { flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-column-toggle";
import {
  DataViewToolbar,
  type FileFormat,
} from "../data-view-criteria/data-view-toolbar";
import { Sorting, type SortingField } from "../sorting/sorting";
import type { UseCriteriaReturn } from "@/types/use-criteria.type";
import { Button } from "../ui/button";
import { RefreshCcwIcon } from "lucide-react";
import type { CriteriaTable } from "@/types/use-criteria-table.type";

interface DataTableCriteriaProps<TData> {
  table: CriteriaTable<TData>;
  emptyMessage?: string;
  onExport?: (format: FileFormat) => Promise<string> | string;
  showColumnToggle?: boolean;
  actionBar?: React.ReactNode;
  criteria: UseCriteriaReturn<TData>;
}

export function DataTableCriteria<TData>({
  criteria,
  table,
  emptyMessage = "No results.",
  showColumnToggle = true,
  onExport,
  actionBar,
}: DataTableCriteriaProps<TData>) {
  const columnCount = table.getAllColumns().length;

  const columsToSort: SortingField[] =
    table.getAllColumns().map((column) => ({
      field: column.id,
      fieldLabel: column.id,
    })) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={table.refetch}
          className="size-8"
        >
          <RefreshCcwIcon className="size-3.5" />
        </Button>
        <DataViewToolbar
          criteria={criteria}
          searchProps={table.searchProps}
          queryFilter={table.queryFilter}
          actionBar={actionBar}
          onExport={onExport}
        >
          <Sorting fields={columsToSort} criteria={criteria} />
          {showColumnToggle && <DataTableViewOptions table={table} />}
        </DataViewToolbar>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.isLoading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="ml-2">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.error ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center space-y-2"
                >
                  <div className="text-red-500">
                    {table.error.message || "Error loading data"}
                  </div>
                  <Button variant="outline" size="sm" onClick={table.refetch}>
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.data && <DataTablePagination table={table} meta={table.data.meta} />}
    </div>
  );
}
