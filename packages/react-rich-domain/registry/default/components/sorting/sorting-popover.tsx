"use client";

import * as React from "react";
import { ListOrdered, Search, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import type { Order, FieldPath, OrderDirection } from "@woltz/rich-domain";
import type { SortingField } from "./sorting";

interface SortingPopoverProps<T = unknown> {
  fields: SortingField[];
  sorting: Order[];
  onAdd: (field: FieldPath<T>, direction?: OrderDirection) => void;
  onClear: () => void;
}

export function SortingPopover<T = unknown>({
  fields,
  sorting,
  onAdd,
  onClear,
}: SortingPopoverProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const usedFields = sorting.map((sort) => sort.field);
  const remainingFields = fields.filter(
    (field) => !usedFields.includes(field.field)
  );

  const HAS_FIELDS_REMAINING = remainingFields.length > 0;

  const filteredRemainingFields = remainingFields.filter((field) =>
    field.fieldLabel.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectField = (field: SortingField) => {
    onAdd(field.field as FieldPath<T>, "asc");
    setSearch("");
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearch("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 bg-transparent"
            disabled={!HAS_FIELDS_REMAINING}
          >
            <ListOrdered className="h-4 w-4" />
            Add Sort
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 bg-card w-fit" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search fields..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredRemainingFields.map((field) => (
              <button
                key={field.field}
                onClick={() => handleSelectField(field)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="flex-1 text-left">{field.fieldLabel}</span>
              </button>
            ))}
            {filteredRemainingFields.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search ? "No fields found" : "All fields are already in use"}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={onClear}
      >
        <X className="h-4 w-4" />
        Clear Sorting
      </Button>
    </div>
  );
}
