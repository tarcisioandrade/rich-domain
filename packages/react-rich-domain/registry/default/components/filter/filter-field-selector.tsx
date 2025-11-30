"use client";

import * as React from "react";
import { Check, Search, Type, Hash, Calendar, ToggleLeft } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { QueryFilter, FilterType } from "@/lib/filter-types";

interface FilterFieldSelectorProps {
  fields: QueryFilter[];
  selectedField: string;
  onSelect: (field: QueryFilter) => void;
  usedFields?: string[];
}

const TYPE_ICONS: Record<FilterType, React.ReactNode> = {
  string: <Type className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  boolean: <ToggleLeft className="h-4 w-4" />,
};

export function FilterFieldSelector({
  fields,
  selectedField,
  onSelect,
  usedFields = [],
}: FilterFieldSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedFieldData = fields.find((f) => f.field === selectedField);

  const availableFields = fields.filter(
    (field) =>
      field.field === selectedField || !usedFields.includes(field.field)
  );

  const filteredFields = availableFields.filter((field) =>
    field.fieldLabel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        >
          {selectedFieldData && TYPE_ICONS[selectedFieldData.type]}
          <span>{selectedFieldData?.fieldLabel || "Select field"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
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
          {filteredFields.map((field) => (
            <button
              key={field.field}
              onClick={() => {
                onSelect(field);
                setOpen(false);
                setSearch("");
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                selectedField === field.field && "bg-accent"
              )}
            >
              <span className="text-muted-foreground">
                {TYPE_ICONS[field.type]}
              </span>
              <span className="flex-1 text-left">{field.fieldLabel}</span>
              {selectedField === field.field && (
                <Check className="h-4 w-4 text-foreground" />
              )}
            </button>
          ))}
          {filteredFields.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No fields found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
