"use client";

import * as React from "react";
import { Check, Search, X, Plus, CircleDashed } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { QueryFilter, FilterOperator } from "../../lib/filter-utils";
import {
  operatorSupportsMultipleValues,
  operatorIsBetween,
} from "../../lib/filter-utils";

interface FilterValueSelectorProps {
  filter: QueryFilter;
  operator: FilterOperator;
  value:
    | string
    | string[]
    | number
    | number[]
    | [string, string]
    | [number, number];
  onChange: (
    value:
      | string
      | string[]
      | number
      | number[]
      | [string, string]
      | [number, number]
  ) => void;
}

export function FilterValueSelector({
  filter,
  operator,
  value,
  onChange,
}: FilterValueSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const isMultiple = operatorSupportsMultipleValues(operator);
  const isBetween = operatorIsBetween(operator);
  const hasOptions = filter.options && filter.options.length > 0;

  const selectedValues: string[] = React.useMemo(() => {
    if (isBetween || !value) return [];
    if (Array.isArray(value)) return value.map(String);
    return [String(value)];
  }, [value, isBetween]);

  const filteredOptions =
    filter.options?.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const handleSelect = (optionValue: string) => {
    if (isMultiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setOpen(false);
    }
  };

  const handleRemoveValue = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMultiple) {
      onChange(selectedValues.filter((v) => v !== optionValue));
    } else {
      onChange("");
    }
  };

  const getOptionLabel = (val: string) => {
    return filter.options?.find((opt) => opt.value === val)?.label || val;
  };

  const getOptionIcon = (val: string) => {
    return (
      filter.options?.find((opt) => opt.value === val)?.icon ?? <CircleDashed />
    );
  };

  if (isBetween && !hasOptions) {
    const betweenValue: [string | number, string | number] =
      Array.isArray(value) && value.length === 2
        ? [value[0], value[1]]
        : ["", ""];
    const fromValue = betweenValue[0];
    const toValue = betweenValue[1];

    return (
      <div className="flex items-center gap-1">
        <Input
          type={filter.type === "number" ? "number" : "text"}
          placeholder="From..."
          value={fromValue ?? ""}
          onChange={(e) => {
            const newFrom =
              filter.type === "number"
                ? e.target.value
                  ? Number(e.target.value)
                  : 0
                : e.target.value;
            onChange([newFrom, toValue] as [number, number] | [string, string]);
          }}
          className="h-7 w-24 text-sm"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type={filter.type === "number" ? "number" : "text"}
          placeholder="To..."
          value={toValue ?? ""}
          onChange={(e) => {
            const newTo =
              filter.type === "number"
                ? e.target.value
                  ? Number(e.target.value)
                  : 0
                : e.target.value;
            onChange([fromValue, newTo] as [number, number] | [string, string]);
          }}
          className="h-7 w-24 text-sm"
        />
      </div>
    );
  }

  if (hasOptions) {
    const renderDisplayContent = () => {
      if (selectedValues.length === 0) {
        return (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">Selecionar</span>
          </div>
        );
      }

      if (selectedValues.length === 1) {
        const val = selectedValues[0];
        return (
          <div className="flex items-center gap-1">
            {getOptionIcon(val)}
            <span className="text-xs">{getOptionLabel(val)}</span>
            <div
              onClick={(e) => handleRemoveValue(val, e)}
              role="button"
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center -space-x-2.5">
            {selectedValues.slice(0, 3).map((val) => {
              const icon = getOptionIcon(val);
              return icon ? (
                <div
                  key={val}
                  className="rounded-full border bg-background p-0.5"
                >
                  <span className="text-[10px]">{icon}</span>
                </div>
              ) : null;
            })}
          </div>
          <span className="text-xs font-medium truncate">
            {selectedValues.length} selected
            {selectedValues.length > 1 ? "s" : ""}
          </span>
        </div>
      );
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 gap-1 pl-1.5 pr-1.5 text-xs font-normal hover:bg-secondary/80"
          >
            {renderDisplayContent()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search options..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                  selectedValues.includes(option.value) && "bg-accent"
                )}
              >
                {option.icon && (
                  <span className="text-muted-foreground">{option.icon}</span>
                )}
                <span className="flex-1 text-left">{option.label}</span>
                {selectedValues.includes(option.value) && (
                  <Check className="h-4 w-4" />
                )}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No options found
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Simple input for non-array values
  const simpleValue = Array.isArray(value) ? "" : value ?? "";

  return (
    <Input
      type={filter.type === "number" ? "number" : "text"}
      placeholder="Enter value..."
      // value={simpleValue}
      defaultValue={simpleValue}
      onChange={(e) => {
        const newValue =
          filter.type === "number"
            ? e.target.value
              ? Number(e.target.value)
              : 0
            : e.target.value;
        onChange(newValue);
      }}
      className="h-7 w-32 text-sm"
    />
  );
}
