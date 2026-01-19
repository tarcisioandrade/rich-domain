"use client";

import { flexRender, type Table as TableType } from "@tanstack/react-table";
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
import type { PaginatedResult } from "@/hooks/use-criteria-query";
import type { FilterIntegrationProps } from "../data-view-criteria/data-view-filter/data-view-filter";
import { DataViewToolbar, type FileFormat } from "../data-view-criteria/data-view-toolbar";

interface DataTableCriteriaProps<TData> {
  table: TableType<TData>;
  isLoading?: boolean;
  emptyMessage?: string;
  onExport?: (format: FileFormat) => Promise<string> | string;
  data?: PaginatedResult<TData>;
  showColumnToggle?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  actionBar?: React.ReactNode;
  filterProps?: FilterIntegrationProps;
}

export function DataTableCriteria<TData>({
  table,
  isLoading = false,
  emptyMessage = "No results.",
  data,
  showColumnToggle = true,
  onExport,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = false,
  actionBar,
  filterProps,
}: DataTableCriteriaProps<TData>) {
  const columnCount = table.getAllColumns().length;

  return (
    <div className="space-y-4">
      <DataViewToolbar
        searchProps={{
          searchValue,
          onSearchChange: onSearchChange ?? (() => {}),
          showSearch,
        }}
        searchPlaceholder={searchPlaceholder}
        filterProps={filterProps}
        actionBar={actionBar}
        onExport={onExport}
      >
        {showColumnToggle && <DataTableViewOptions table={table} />}
      </DataViewToolbar>

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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="ml-2">Loading...</span>
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
      {data && <DataTablePagination table={table} meta={data.meta} />}
    </div>
  );
}
