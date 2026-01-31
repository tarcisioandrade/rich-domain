"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Code, FileBarChart, FileIcon, Loader2, Search, X } from "lucide-react";
import {
  DataViewFilter,
  type SearchIntegrationProps,
} from "./data-view-filter/data-view-filter";

import { useTransition } from "react";
import type { UseCriteriaReturn } from "@/types/use-criteria.type";
import type { QueryFilter } from "@/lib/filter-utils";

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
  criteria: UseCriteriaReturn<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  searchProps?: Partial<SearchIntegrationProps>;
  queryFilter?: QueryFilter[];
  actionBar?: React.ReactNode;
  onExport?: (format: FileFormat) => Promise<string> | string;
  children?: React.ReactNode;
}

export function DataViewToolbar({
  criteria,
  searchProps,
  queryFilter,
  actionBar,
  onExport,
  children,
}: DataViewToolbarProps) {
  const hasSearch = searchProps?.showSearch && searchProps?.onSearchChange;
  const hasFilters = queryFilter && queryFilter.length > 0;
  const showClearFiltersButton = criteria.filters.length > 0 || criteria.search;

  function onClear() {
    criteria.clearFilters();
    criteria.clearSearch();
    const searchInput = document.getElementById(
      "criteria-search"
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex items-center gap-2">
        {hasSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="criteria-search"
              placeholder={searchProps?.searchPlaceholder ?? "Search..."}
              onChange={(e) => searchProps!.onSearchChange!(e.target.value)}
              defaultValue={searchProps!.searchValue}
              className="pl-8 pr-8 h-8"
            />
          </div>
        )}
        {hasFilters && (
          <DataViewFilter queryFilter={queryFilter} criteria={criteria} />
        )}
        {showClearFiltersButton && (
          <Button
            size="icon"
            className="size-8"
            variant="outline"
            onClick={onClear}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="ml-auto flex gap-2">
        {actionBar || onExport ? (
          <FullBar actionBar={actionBar} onExport={onExport}>
            {children}
          </FullBar>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

interface FullBarProps {
  onExport?: (format: FileFormat) => Promise<string> | string;
  actionBar: React.ReactNode;
  children: React.ReactNode;
}

function FullBar({ onExport, actionBar, children }: FullBarProps) {
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
    <>
      {actionBar}
      {children}
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
    </>
  );
}
