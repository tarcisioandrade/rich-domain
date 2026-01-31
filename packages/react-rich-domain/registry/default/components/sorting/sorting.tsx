"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "../ui/badge";
import type { UseCriteriaReturn } from "../../types/use-criteria.type";
import { SortingPopover } from "./sorting-popover";
import { SortingList } from "./sorting-list";
import { useSortingAdapter } from "../../hooks/use-sorting-adapter";

export interface SortingField {
  field: string;
  fieldLabel: string;
}

export interface SortingIntegrationProps<T = unknown> {
  fields: SortingField[];
  criteria: UseCriteriaReturn<T>;
}

export function Sorting<T = unknown>({
  fields,
  criteria,
}: SortingIntegrationProps<T>) {
  const { updateSort, reorderSort } = useSortingAdapter(criteria);

  const sortingCount = criteria.sorting.length;
  const hasSorting = sortingCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 relative">
          <ArrowUpDown className="h-4 w-4" />
          Sort
          {hasSorting && (
            <Badge className="text-[10px] rounded bg-secondary size-[18px] text-foreground">
              {sortingCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[450px] p-4" align="end">
        {!hasSorting ? (
          <div className="space-y-0.5 mb-4">
            <p className="font-semibold">No sorting applied</p>
            <p className="text-sm text-muted-foreground">
              Add sorting to your query
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            <p className="font-semibold">Sort By</p>
            <SortingList
              sorting={criteria.sorting}
              fields={fields}
              onUpdate={updateSort}
              onRemove={criteria.removeSort}
              onReorder={reorderSort}
            />
          </div>
        )}
        <SortingPopover
          sorting={criteria.sorting}
          fields={fields}
          onAdd={criteria.addSort}
          onClear={criteria.clearSort}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
