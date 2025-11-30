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
import {
  type QueryFilter,
  type FilterValue,
  type FilterType,
  getDefaultOperator,
  defineDefaultFilterValue,
  operatorSupportsMultipleValues,
} from "../../lib/filter-types";
import type {
  FieldPath,
  Filter,
  FilterValueFor,
  OperatorsForType,
} from "@woltz/rich-domain";
import type { UseCriteriaReturn } from "@/types/use-criteria.type";

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
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

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

  const handleAddFilter = (field: QueryFilter) => {
    setOpen(false);
    setSearch("");

    setTimeout(() => {
      const defaultValue = defineDefaultFilterValue(field.type);

      addOrReplaceByIndex({
        field: field.field as FieldPath<unknown>,
        operator: getDefaultOperator(field.type) as OperatorsForType<never>,
        value: defaultValue as FilterValueFor<never>,
      });
    }, 200);
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

    if (prevOperatorIsArrayOperator && !newOperatorIsArrayOperator) {
      value = null;
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 bg-transparent"
              disabled={!HAS_FIELDS_REMAINING}
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
              {filteredRemainingFields.map((field) => (
                <button
                  key={field.field}
                  onClick={() => handleAddFilter(field)}
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
                  {search ? "No fields found" : "All fields are already in use"}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
