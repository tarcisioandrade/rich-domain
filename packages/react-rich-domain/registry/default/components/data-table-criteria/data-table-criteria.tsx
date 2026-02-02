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
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-column-toggle";
import {
  DataViewToolbar,
  type FileFormat,
} from "../data-view-criteria/data-view-toolbar";
import { Sorting, type SortingField } from "../sorting/sorting";
import type { UseCriteriaReturn } from "@/types/use-criteria.type";
import { Button } from "../ui/button";
import { AlertCircleIcon, RefreshCcwIcon } from "lucide-react";
import type { CriteriaTable } from "@/types/use-criteria-table.type";
import { cn } from "@/lib/utils";

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

  const isInitialLoading = table.isLoading;
  const isRefetching = table.isFetching;

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
          onClick={() => table.refetch()}
          disabled={table.isFetching}
          className="size-8"
        >
          <RefreshCcwIcon
            className={cn("size-3.5", table.isFetching && "animate-spin")}
          />
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
      <div className="relative overflow-hidden rounded-md border">
        {isRefetching && (
          <div className="absolute inset-0 z-10 bg-background/50" />
        )}
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
            {isInitialLoading ? (
              Array.from({ length: table.getState().pagination.pageSize }).map(
                (_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {Array.from({ length: columnCount }).map((_, cellIndex) => (
                      <TableCell key={`skeleton-cell-${cellIndex}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                )
              )
            ) : table.error ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                      <AlertCircleIcon className="size-6 text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        Failed to load data
                      </p>
                      <p className="text-sm text-red-500 max-w-sm">
                        {table.error.message ||
                          "An unexpected error occurred. Please try again."}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.refetch()}
                      className="mt-2"
                    >
                      <RefreshCcwIcon className="mr-2 size-3.5" />
                      Try again
                    </Button>
                  </div>
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
      {table.data && (
        <DataTablePagination table={table} meta={table.data.meta} />
      )}
    </div>
  );
}
