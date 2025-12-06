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
import {
  type FilterType,
  type FilterOperator,
  getOperatorsByType,
  OPERATOR_LABELS,
} from "@/lib/filter-utils";

interface FilterOperatorSelectorProps {
  type: FilterType;
  isNullable?: boolean;
  selectedOperator: FilterOperator;
  onSelect: (operator: FilterOperator) => void;
}

export function FilterOperatorSelector({
  type,
  isNullable,
  selectedOperator,
  onSelect,
}: FilterOperatorSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const op = getOperatorsByType(type);

  const operators = isNullable
    ? op
    : op.filter(
        (operator) => operator !== "isNull" && operator !== "isNotNull"
      );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-7 gap-1 px-2 text-xs font-normal"
        >
          {OPERATOR_LABELS[selectedOperator]}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <div className="max-h-60 overflow-y-auto">
          {operators.map((operator) => (
            <button
              key={operator}
              onClick={() => {
                onSelect(operator);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                selectedOperator === operator && "bg-accent"
              )}
            >
              <span>{OPERATOR_LABELS[operator]}</span>
              {selectedOperator === operator && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
