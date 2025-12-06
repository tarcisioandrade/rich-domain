"use client";

import * as React from "react";
import {
  ListFilter,
  X,
  Search,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterRow } from "./filter-row";
import { FilterValueSelector } from "./filter-value-selector";
import { FilterOperatorSelector } from "./filter-operator-selector";
import { FilterDateValue } from "./filter-date-value";
import { FilterBooleanValue } from "./filter-boolean-value";
import {
  type QueryFilter,
  type FilterValue,
  type FilterType,
  getDefaultOperator,
  defineDefaultFilterValue,
  operatorSupportsMultipleValues,
  operatorRequiresValue,
  operatorIsBetween,
} from "../../lib/filter-utils";
import {
  type FieldPath,
  type Filter,
  type FilterValueFor,
  type OperatorsForType,
  isValidOperatorForType,
} from "@woltz/rich-domain";
import type { UseCriteriaReturn } from "@/types/use-criteria.type";
import { cn } from "@/lib/utils";

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

export function Filter({
  fields,
  filters,
  addOrReplaceByIndex,
  removeFilter,
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

  const filterValues: FilterValue[] = filters.map((filter) => ({
    field: filter.field,
    operator: filter.operator as FilterValue["operator"],
    value: filter.value as FilterValue["value"],
  }));

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
    const defaultValue = operatorIsBetween(defaultOp)
      ? field.type === "number"
        ? [0, 0]
        : ["", ""]
      : defineDefaultFilterValue(field.type, defaultOp);
    setTempValue(defaultValue);
    setSearch("");
    setAddFilterStep("value");
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

  const handleUpdateFilter = (index: number, newValue: FilterValue) => {
    const prevFilter = filterValues[index];
    if (!prevFilter) return;

    const newField = fields.find((f) => f.field === newValue.field);
    const prevField = fields.find((f) => f.field === prevFilter.field);
    if (!newField || !prevField) return;

    const fieldTypeChanged = prevField.type !== newField.type;

    const operator = fieldTypeChanged
      ? getDefaultOperator(newField.type)
      : newValue.operator;

    let value =
      newValue.value === null || fieldTypeChanged
        ? defineDefaultFilterValue(newField.type, newValue.operator)
        : newValue.value;

    const newOperatorIsArrayOperator = operatorSupportsMultipleValues(operator);
    const prevOperatorIsArrayOperator = operatorSupportsMultipleValues(
      prevFilter.operator
    );
    const newOperatorIsBetween = operatorIsBetween(operator);
    const prevOperatorIsBetween = operatorIsBetween(prevFilter.operator);

    if (prevOperatorIsArrayOperator && !newOperatorIsArrayOperator) {
      value = null;
    }

    if (prevOperatorIsBetween && !newOperatorIsBetween) {
      value = null;
    } else if (!prevOperatorIsBetween && newOperatorIsBetween) {
      value = newField.type === "number" ? [0, 0] : ["", ""];
    }

    addOrReplaceByIndex({
      field: newField.field as FieldPath<unknown>,
      operator: operator as OperatorsForType<never>,
      value: value as FilterValueFor<never>,
      replaceIndex: index,
    });
  };

  const handleSelectField = (index: number, newValue: FilterValue) => {
    const filterToUpdate = filters[index];
    if (!filterToUpdate) return;

    const newField = fields.find((f) => f.field === newValue.field);
    const oldField = fields.find((f) => f.field === filterToUpdate.field);

    if (!newField || !oldField) return;

    let value = filterToUpdate.value;
    let operator = newValue.operator;

    if (newField.type !== oldField.type) {
      operator = getDefaultOperator(newField.type);
      value = defineDefaultFilterValue(newField.type);
    }

    addOrReplaceByIndex({
      field: newValue.field as FieldPath<unknown>,
      operator: operator as OperatorsForType<never>,
      value: value as FilterValueFor<never>,
      replaceIndex: index,
    });
  };

  const handleRemoveFilter = (index: number) => {
    removeFilter(index);
  };

  const canAddFilter = React.useMemo(() => {
    if (!selectedFieldForAdd) return false;
    return isValidOperatorForType(tempValue, tempOperator);
  }, [tempValue, tempOperator, selectedFieldForAdd]);

  const STEP_VALUE_ADD_FILTER_BUTTON_DISABLED =
    !canAddFilter || tempValue === null || tempValue === "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filterValues.map((filter, index) => (
        <FilterRow
          key={`${filter.field}-${index}`}
          fields={fields}
          value={filter}
          onChange={(newValue) => handleUpdateFilter(index, newValue)}
          onSelectField={(newValue) => handleSelectField(index, newValue)}
          onRemove={() => handleRemoveFilter(index)}
          usedFields={usedFields}
        />
      ))}
      <div className="flex items-center gap-2">
        {filterValues.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 bg-transparent"
            onClick={clearFilters}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
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
              {filterValues.length === 0 ? (
                <>
                  <ListFilter className="h-4 w-4" />
                  Add Filter
                </>
              ) : (
                <ListFilter className="h-4 w-4" />
              )}
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
                      <span className="flex-1 text-left">
                        {field.fieldLabel}
                      </span>
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
                      onSelect={(op) => {
                        const prevOperatorIsBetween =
                          operatorIsBetween(tempOperator);
                        const newOperatorIsBetween = operatorIsBetween(op);

                        setTempOperator(op);

                        if (!operatorRequiresValue(op)) {
                          setTempValue(null);
                        } else if (
                          !prevOperatorIsBetween &&
                          newOperatorIsBetween
                        ) {
                          // Switching to between operator
                          setTempValue(
                            selectedFieldForAdd.type === "number"
                              ? [0, 0]
                              : ["", ""]
                          );
                        } else if (
                          prevOperatorIsBetween &&
                          !newOperatorIsBetween
                        ) {
                          // Switching from between operator
                          setTempValue(
                            defineDefaultFilterValue(
                              selectedFieldForAdd.type,
                              op
                            )
                          );
                        }
                      }}
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
      </div>
    </div>
  );
}
