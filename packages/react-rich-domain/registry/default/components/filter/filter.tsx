"use client";

import { ListFilter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterRow } from "./filter-row";
import {
  type QueryFilter,
  type FilterValue,
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
import { getQueryParams } from "@/lib/utils";
import type { UseCriteriaReturn } from "@/types/use-criteria.type";

interface FilterProps {
  fields: QueryFilter[];
  filters: Filter<string, unknown>[];
  addOrReplaceByIndex: UseCriteriaReturn<unknown>["addOrReplaceByIndex"];
  removeFilter: (index: number) => void;
  clearFilters: () => void;
}

export function Filter({
  fields,
  filters,
  addOrReplaceByIndex,
  removeFilter,
  clearFilters,
}: FilterProps) {
  const filterValues: FilterValue[] = filters.map((filter) => ({
    field: filter.field,
    operator: filter.operator as FilterValue["operator"],
    value: filter.value as FilterValue["value"],
  }));

  const remainingFields = fields.filter((field) => {
    const query = getQueryParams();
    const filtredFields = Object.keys(query).map((key) => key.split(":")[0]);
    return !filtredFields.includes(field.field);
  });

  const HAS_FIELDS_REMAINING = remainingFields.length > 0;

  const handleAddFilter = () => {
    if (!HAS_FIELDS_REMAINING) return;
    const firstField = remainingFields[0];

    const defaultValue = defineDefaultFilterValue(firstField.type);

    addOrReplaceByIndex({
      field: firstField.field as FieldPath<unknown>,
      operator: getDefaultOperator(firstField.type) as OperatorsForType<never>,
      value: defaultValue as FilterValueFor<never>,
    });
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
        ? defineDefaultFilterValue(newField.type)
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
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 bg-transparent"
          onClick={handleAddFilter}
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
      </div>
    </div>
  );
}
