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
} from "@/lib/filter-types";

interface FilterRowProps {
  fields: QueryFilter[];
  value: FilterValue;
  onSelectField: (value: FilterValue) => void;
  onChange: (value: FilterValue) => void;
  onRemove: () => void;
}

export function FilterRow({
  fields,
  value,
  onChange,
  onRemove,
  onSelectField,
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
    onChange({
      ...value,
      operator,
      value: operatorRequiresValue(operator) ? value.value : null,
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
          value={value.value as Date | [Date, Date] | null}
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
    <div className="group flex items-center gap-1 rounded-md border border-border bg-card p-1">
      <FilterFieldSelector
        fields={fields}
        selectedField={value.field}
        onSelect={handleFieldChange}
      />
      <FilterOperatorSelector
        type={type}
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
