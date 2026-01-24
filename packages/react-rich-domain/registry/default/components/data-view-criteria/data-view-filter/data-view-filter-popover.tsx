"use client";

import * as React from "react";
import {
  ListFilter,
  Search,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type FieldPath,
  type Filter,
  type FilterOperator,
  type FilterValueFor,
  type OperatorsForType,
  isValidOperatorForType,
} from "@woltz/rich-domain";
import type { UseCriteriaReturn } from "@/types/use-criteria.type";
import { cn } from "@/lib/utils";
import { FilterBooleanValue } from "@/components/filter/filter-boolean-value";
import { FilterDateValue } from "@/components/filter/filter-date-value";
import { FilterOperatorSelector } from "@/components/filter/filter-operator-selector";
import { FilterValueSelector } from "@/components/filter/filter-value-selector";
import {
  type QueryFilter,
  type FilterType,
  type FilterValue,
  getDefaultOperator,
  operatorIsBetween,
  defineDefaultFilterValue,
  operatorRequiresValue,
} from "@/lib/filter-utils";

interface FilterProps {
  fields: QueryFilter[];
  filters: Filter<string, unknown>[];
  addOrReplaceByIndex: UseCriteriaReturn<unknown>["addOrReplaceByIndex"];
  removeFilter: (index: number) => void;
  clearFilters: () => void;
}

const TYPE_ICONS: Record<FilterType, React.ReactNode> = {
  string: <Type className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  boolean: <ToggleLeft className="h-4 w-4" />,
};

export function DataViewFilterPopover({
  fields,
  filters,
  addOrReplaceByIndex,
  clearFilters,
}: FilterProps) {
  const [addFilterStep, setAddFilterStep] = React.useState<
    null | "field" | "value"
  >(null);
  const [search, setSearch] = React.useState("");
  const [selectedFieldForAdd, setSelectedFieldForAdd] =
    React.useState<QueryFilter | null>(null);
  const [tempOperator, setTempOperator] =
    React.useState<FilterValue["operator"]>("equals");
  const [tempValue, setTempValue] = React.useState<FilterValue["value"]>(null);

  const usedFields = filters.map((filter) => filter.field);
  const remainingFields = fields.filter(
    (field) => !usedFields.includes(field.field)
  );

  const HAS_FIELDS_REMAINING = remainingFields.length > 0;

  const filteredRemainingFields = remainingFields.filter((field) =>
    field.fieldLabel.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectFieldForAdd = (field: QueryFilter) => {
    setSelectedFieldForAdd(field);
    const defaultOp = getDefaultOperator(field.type);
    setTempOperator(defaultOp);

    const defaultDateRange = [
      new Date().toISOString(),
      new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    ];

    const defaultValue = operatorIsBetween(defaultOp)
      ? field.type === "number"
        ? [0, 0]
        : field.type === "date"
          ? defaultDateRange
          : ["", ""]
      : defineDefaultFilterValue(field.type, defaultOp);

    console.log("defaultValue", defaultValue);
    setTempValue(defaultValue);
    setSearch("");
    setAddFilterStep("value");
  };

  const onSelectOperator = (op: FilterOperator) => {
    if (!selectedFieldForAdd) return;

    const defaultDateRange = [
      new Date().toISOString(),
      new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    ];
    const defaultValue =
      selectedFieldForAdd.type === "date"
        ? defaultDateRange
        : selectedFieldForAdd.type === "number"
          ? [0, 0]
          : ["", ""];

    const prevOperatorIsBetween = operatorIsBetween(tempOperator);
    const newOperatorIsBetween = operatorIsBetween(op);

    setTempOperator(op);

    if (!operatorRequiresValue(op)) {
      setTempValue(null);
    } else if (!prevOperatorIsBetween && newOperatorIsBetween) {
      setTempValue(defaultValue);
    } else if (prevOperatorIsBetween && !newOperatorIsBetween) {
      setTempValue(defineDefaultFilterValue(selectedFieldForAdd.type, op));
    }
  };

  const handleConfirmAddFilter = () => {
    if (!selectedFieldForAdd || tempValue === null) return;

    addOrReplaceByIndex({
      field: selectedFieldForAdd.field as FieldPath<unknown>,
      operator: tempOperator as OperatorsForType<never>,
      value: tempValue as FilterValueFor<never>,
    });

    setAddFilterStep(null);
    setSelectedFieldForAdd(null);
    setTempOperator("equals");
    setTempValue(null);
  };

  const handleCancelAddFilter = () => {
    setAddFilterStep(null);
    setSelectedFieldForAdd(null);
    setTempOperator("equals");
    setTempValue(null);
    setSearch("");
  };

  const canAddFilter = React.useMemo(() => {
    if (!selectedFieldForAdd) return false;
    return isValidOperatorForType(tempValue, tempOperator);
  }, [tempValue, tempOperator, selectedFieldForAdd]);

  const STEP_VALUE_ADD_FILTER_BUTTON_DISABLED =
    !canAddFilter || tempValue === null || tempValue === "";

  return (
    <div className="flex items-center gap-2">
      <Popover
        open={addFilterStep !== null}
        onOpenChange={(open) => !open && handleCancelAddFilter()}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 bg-transparent"
            disabled={!HAS_FIELDS_REMAINING}
            onClick={() => setAddFilterStep("field")}
          >
            <ListFilter className="h-4 w-4" />
            Add Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            addFilterStep === "field" ? "p-0" : "min-w-64 p-3",
            "bg-card w-fit"
          )}
          align="start"
        >
          {addFilterStep === "field" ? (
            <>
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
                    onClick={() => handleSelectFieldForAdd(field)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className="text-muted-foreground">
                      {TYPE_ICONS[field.type]}
                    </span>
                    <span className="flex-1 text-left">{field.fieldLabel}</span>
                  </button>
                ))}
                {filteredRemainingFields.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {search
                      ? "No fields found"
                      : "All fields are already in use"}
                  </div>
                )}
              </div>
            </>
          ) : addFilterStep === "value" && selectedFieldForAdd ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <span className="text-muted-foreground">
                  {TYPE_ICONS[selectedFieldForAdd.type]}
                </span>
                <span className="font-medium text-foreground text-sm">
                  {selectedFieldForAdd.fieldLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 ">
                <div className="space-y-2 h-7">
                  <FilterOperatorSelector
                    type={selectedFieldForAdd.type}
                    isNullable={selectedFieldForAdd.isNullable}
                    selectedOperator={tempOperator}
                    onSelect={onSelectOperator}
                  />
                </div>

                {operatorRequiresValue(tempOperator) && (
                  <div className="space-y-2 flex-1 h-7">
                    {selectedFieldForAdd.type === "date" ? (
                      <FilterDateValue
                        operator={tempOperator}
                        value={tempValue as string | [string, string] | null}
                        onChange={setTempValue}
                      />
                    ) : selectedFieldForAdd.type === "boolean" ? (
                      <FilterBooleanValue
                        value={tempValue as boolean | null}
                        onChange={setTempValue}
                      />
                    ) : (
                      <FilterValueSelector
                        filter={selectedFieldForAdd}
                        operator={tempOperator}
                        value={tempValue as string | string[]}
                        onChange={setTempValue}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={handleCancelAddFilter}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  disabled={STEP_VALUE_ADD_FILTER_BUTTON_DISABLED}
                  onClick={handleConfirmAddFilter}
                >
                  Add Filter
                </Button>
              </div>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={clearFilters}
      >
        <X className="h-4 w-4" />
        Clear Filters
      </Button>
    </div>
  );
}
