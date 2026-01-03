"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Code, FileBarChart, FileIcon, Loader2, Search } from "lucide-react";
import { DataViewFilter, type FilterIntegrationProps, type SearchIntegrationProps } from "./data-view-filter/data-view-filter";

import { useTransition } from "react";

export type FileFormat = "csv" | "excel" | "json";

function downloadFile(filename: string, content: string, format: FileFormat) {
  const fileExtension: Record<FileFormat, string> = {
    csv: "text/csv",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    json: "application/json",
  };

  const blob = new Blob([content], { type: fileExtension[format] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

interface DataViewToolbarProps {
  searchProps?: SearchIntegrationProps;
  searchPlaceholder?: string;
  filterProps?: FilterIntegrationProps;
  actionBar?: React.ReactNode;
  onExport?: (format: FileFormat) => Promise<string> | string;
}

export function DataViewToolbar({
  searchProps,
  searchPlaceholder = "Search...",
  filterProps,
  actionBar,
  onExport,
}: DataViewToolbarProps) {
  const hasSearch = searchProps?.showSearch && searchProps?.onSearchChange;
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
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {hasSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              onChange={(e) => searchProps.onSearchChange(e.target.value)}
              defaultValue={searchProps.searchValue}
              className="pl-8 pr-8 h-8"
            />
          </div>
        )}
        {hasFilters && <DataViewFilter {...filterProps} />}
      </div>
      {(actionBar || onExport) && (
        <div className="ml-auto flex gap-2">
          {actionBar}
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
                    <>
                      <FileIcon className="h-4 w-4" />
                      Export
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileIcon className="h-4 w-4" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  <FileBarChart className="h-4 w-4" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <Code className="h-4 w-4" />
                  JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
