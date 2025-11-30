"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { FilterOperator } from "@/lib/filter-types";

interface FilterDateValueProps {
  operator: FilterOperator;
  value: string | [string, string] | null;
  onChange: (value: string | [string, string] | null) => void;
}

export function FilterDateValue({
  operator,
  value,
  onChange,
}: FilterDateValueProps) {
  const [open, setOpen] = React.useState(false);
  const isBetween = operator === "between";

  const dateRange = isBetween && Array.isArray(value) ? value : undefined;
  const singleDate =
    !isBetween && value ? new Date(value as string) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className={cn(
            "h-7 justify-start gap-1.5 px-2 text-xs font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {singleDate
            ? format(singleDate, "MMM d, yyyy")
            : dateRange
            ? `${format(new Date(dateRange[0]), "MMM d")} - ${format(
                new Date(dateRange[1]),
                "MMM d"
              )}`
            : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {isBetween ? (
          <Calendar
            mode="range"
            selected={
              dateRange
                ? { from: new Date(dateRange[0]), to: new Date(dateRange[1]) }
                : undefined
            }
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onChange([range.from.toISOString(), range.to.toISOString()]);
                setOpen(false);
              }
            }}
            autoFocus
            numberOfMonths={2}
          />
        ) : (
          <Calendar
            mode="single"
            selected={singleDate}
            onSelect={(date) => {
              onChange(date?.toISOString() || null);
              setOpen(false);
            }}
            autoFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
