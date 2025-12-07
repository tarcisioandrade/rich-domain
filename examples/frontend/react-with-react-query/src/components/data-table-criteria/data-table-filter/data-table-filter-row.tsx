"use client";

import { FilterRow } from "@/components/filter/filter-row";
import {
  type QueryFilter,
  type FilterValue,
  getDefaultOperator,
  defineDefaultFilterValue,
  operatorSupportsMultipleValues,
  operatorIsBetween,
} from "@/lib/filter-utils";
import {
  type FieldPath,
  type Filter,
  type FilterValueFor,
  type OperatorsForType,
} from "@woltz/rich-domain";
import type { UseCriteriaReturn } from "@/types/use-criteria.type";
import { useDebounceCallback } from "@/hooks/use-debounce-callback";

interface FilterProps {
  fields: QueryFilter[];
  filters: Filter<string, unknown>[];
  addOrReplaceByIndex: UseCriteriaReturn<unknown>["addOrReplaceByIndex"];
  removeFilter: (index: number) => void;
  clearFilters: () => void;
}

export function DataTableFilterRow({
  fields,
  filters,
  addOrReplaceByIndex,
  removeFilter,
}: FilterProps) {
  const filterValues: FilterValue[] = filters.map((filter) => ({
    field: filter.field,
    operator: filter.operator as FilterValue["operator"],
    value: filter.value as FilterValue["value"],
  }));

  const usedFields = filters.map((filter) => filter.field);

 

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

  const [handleUpdateFilterDebounced] = useDebounceCallback((index: number, newValue: FilterValue) => {
    handleUpdateFilter(index, newValue);
  }, 300);


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
    <div className="space-y-2">
      {filterValues.map((filter, index) => (
        <FilterRow
          key={`${filter.field}-${index}`}
          fields={fields}
          value={filter}
          onChange={(newValue) => handleUpdateFilterDebounced(index, newValue)}
          onSelectField={(newValue) => handleSelectField(index, newValue)}
          onRemove={() => handleRemoveFilter(index)}
          usedFields={usedFields}
        />
      ))}
    </div>
  );
}
