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
import type { PaginatedResult } from "@woltz/rich-domain";
import { Input } from "@/components/ui/input";
import { FileIcon, Loader2, Search } from "lucide-react";
import { DataTableFilter } from "./data-table-filter/data-table-filter";
import type { FilterIntegrationProps } from "@/types/use-criteria-table.type";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useTransition } from "react";

type FileFormat = "csv" | "excel" | "json";

function downloadFile(filename: string, content: string, format: FileFormat) {
  const fileExtension: Record<FileFormat, string> = {
    csv: "text/csv",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    json: "application/json",
  };

  const blob = new Blob([content], { type: fileExtension[format] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  console.log("url", url);
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

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
  const hasSearch = showSearch && onSearchChange;
  const showActionBar = actionBar || showColumnToggle;
  const hasFilters = filterProps && filterProps.fields.length > 0;
  const [isExporting, startTransition] = useTransition();

  async function handleExport(format: FileFormat) {
    if (!onExport) {
      console.warn("onExport is not defined");
      return;
    }

    startTransition(async () => {
      try {
        const result = await onExport(format);
        if (result) {
          downloadFile(`exported-${Date.now()}.${format}`, result, format);
        }
      } catch (error) {
        console.error(error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {hasSearch && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                onChange={(e) => onSearchChange(e.target.value)}
                defaultValue={searchValue}
                className="pl-8 pr-8 h-8"
              />
            </div>
          )}
          {hasFilters && <DataTableFilter {...filterProps} />}
        </div>
        {showActionBar && (
          <div className="ml-auto flex gap-2">
            {actionBar}
            {showColumnToggle && <DataTableViewOptions table={table} />}
          </div>
        )}
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Export"
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileIcon className="h-4 w-4" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileIcon className="h-4 w-4" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                <FileIcon className="h-4 w-4" />
                JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
