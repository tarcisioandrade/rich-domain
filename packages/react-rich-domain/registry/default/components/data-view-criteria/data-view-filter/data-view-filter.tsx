"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Button } from "../../ui/button";
import { Filter as FilterIcon } from "lucide-react";
import { DataViewFilterPopover } from "./data-view-filter-popover";
import { DataViewFilterRow } from "./data-view-filter-row";
import { Badge } from "@/components/ui/badge";
import type { QueryFilter } from "@/lib/filter-utils";
import type { UseCriteriaReturn } from "@/types/use-criteria.type";

/**
 * Props for Filter component integration
 */
export interface FilterIntegrationProps {
  queryFilter: QueryFilter[];
  criteria: UseCriteriaReturn<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Props for Search integration
 */
export interface SearchIntegrationProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showSearch: boolean;
}

export function DataViewFilter({
  queryFilter,
  criteria,
}: FilterIntegrationProps) {
  const filtersCount = criteria.filters.length;
  const hasFilters = filtersCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 relative">
          <FilterIcon className="h-4 w-4" />
          Filter
          {hasFilters && (
            <Badge className="text-[10px] rounded bg-secondary size-[18px] text-foreground">
              {filtersCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[450px] p-4" align="start">
        {!hasFilters ? (
          <div className="space-y-0.5 mb-4">
            <p className="font-semibold">No filters applied</p>
            <p className="text-sm text-muted-foreground">
              Add filters to your query
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            <p className="font-semibold">Filters</p>
            <DataViewFilterRow fields={queryFilter} criteria={criteria} />
          </div>
        )}
        <DataViewFilterPopover fields={queryFilter} criteria={criteria} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
