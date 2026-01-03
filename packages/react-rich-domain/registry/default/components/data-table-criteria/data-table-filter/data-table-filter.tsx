"use client";

import type { FilterIntegrationProps } from "@/types/use-criteria-table.type";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Button } from "../../ui/button";
import { Filter as FilterIcon } from "lucide-react";
import { DataTableFilterPopover } from "./data-table-filter-popover";
import { DataTableFilterRow } from "./data-table-filter-row";
import { Badge } from "@/components/ui/badge";

export function DataTableFilter({ filters, ...props }: FilterIntegrationProps) {
  const filtersCount = filters.length;
  const hasFilters = filtersCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 relative">
          <FilterIcon className="h-4 w-4" />
          Filter
          {hasFilters && (
            <Badge className="absolute -top-2.5 -right-2.5">
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
            <DataTableFilterRow filters={filters} {...props} />
          </div>
        )}
        <DataTableFilterPopover filters={filters} {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
