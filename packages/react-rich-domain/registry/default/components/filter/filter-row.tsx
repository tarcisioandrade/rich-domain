"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterFieldSelector } from "./filter-field-selector";
import { FilterOperatorSelector } from "./filter-operator-selector";
import { FilterValueSelector } from "./filter-value-selector";
import { FilterDateValue } from "./filter-date-value";
import { FilterBooleanValue } from "./filter-boolean-value";
import {
  type QueryFilter,
  type FilterValue,
  type FilterOperator,
  getDefaultOperator,
  operatorRequiresValue,
  operatorIsBetween,
  defineDefaultFilterValue,
} from "@/lib/filter-utils";

interface FilterRowProps {
  fields: QueryFilter[];
  value: FilterValue;
  onSelectField: (value: FilterValue) => void;
  onChange: (value: FilterValue) => void;
  onRemove: () => void;
  usedFields?: string[];
}

export function FilterRow({
  fields,
  value,
  onChange,
  onRemove,
  onSelectField,
  usedFields = [],
}: FilterRowProps) {
  const currentField = fields.find((f) => f.field === value.field);
  const type = currentField?.type || "string";

  const handleFieldChange = (field: QueryFilter) => {
    onSelectField({
      field: field.field,
      operator: getDefaultOperator(field.type),
      value: null,
    });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    const prevOperatorIsBetween = operatorIsBetween(value.operator);
    const newOperatorIsBetween = operatorIsBetween(operator);

    let newValue = value.value;

    if (!operatorRequiresValue(operator)) {
      newValue = null;
    } else if (!prevOperatorIsBetween && newOperatorIsBetween) {
      // Switching to between operator
      newValue = type === "number" ? [0, 0] : type === "date" ? ["", ""] : ["", ""];
    } else if (prevOperatorIsBetween && !newOperatorIsBetween) {
      // Switching from between operator
      newValue = defineDefaultFilterValue(type, operator);
    }

    onChange({
      ...value,
      operator,
      value: newValue,
    });
  };

  const handleValueChange = (newValue: FilterValue["value"]) => {
    onChange({
      ...value,
      value: newValue,
    });
  };

  const renderValueInput = () => {
    if (!operatorRequiresValue(value.operator)) {
      return null;
    }

    if (type === "date") {
      return (
        <FilterDateValue
          operator={value.operator}
          value={value.value as string | [string, string] | null}
          onChange={handleValueChange}
        />
      );
    }

    if (type === "boolean") {
      return (
        <FilterBooleanValue
          value={value.value as boolean | null}
          onChange={handleValueChange}
        />
      );
    }

    if (currentField) {
      return (
        <FilterValueSelector
          filter={currentField}
          operator={value.operator}
          value={value.value as string | string[]}
          onChange={handleValueChange}
        />
      );
    }

    return null;
  };


  return (
    <div className="group flex items-center gap-1.5 rounded-md border border-border bg-card p-1">
      <FilterFieldSelector
        fields={fields}
        selectedField={value.field}
        onSelect={handleFieldChange}
        usedFields={usedFields}
      />
      <FilterOperatorSelector
        type={type}
        isNullable={currentField?.isNullable}
        selectedOperator={value.operator}
        onSelect={handleOperatorChange}
      />
      {renderValueInput()}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
