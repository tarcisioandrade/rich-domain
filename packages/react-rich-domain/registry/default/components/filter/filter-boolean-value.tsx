"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterBooleanValueProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
}

const OPTIONS = [
  { label: "True", value: true },
  { label: "False", value: false },
];

export function FilterBooleanValue({
  value,
  onChange,
}: FilterBooleanValueProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = value === null ? "Select..." : value ? "True" : "False";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className={cn(
            "h-7 gap-1 px-2 text-xs font-normal",
            value === null && "text-muted-foreground"
          )}
        >
          {selectedLabel}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-28 p-1" align="start">
        {OPTIONS.map((option) => (
          <button
            key={option.label}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
              value === option.value && "bg-accent"
            )}
          >
            <span>{option.label}</span>
            {value === option.value && <Check className="h-4 w-4" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
