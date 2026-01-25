import {
  type BooleanOperators,
  type DateOperators,
  type NumberOperators,
  type StringOperators,
  STRING_OPERATORS,
  NUMBER_OPERATORS,
  DATE_OPERATORS,
  BOOLEAN_OPERATORS,
} from "@woltz/rich-domain";
import type React from "react";

export type FilterType = "string" | "number" | "boolean" | "date";

export type FilterOperator =
  | StringOperators
  | NumberOperators
  | DateOperators
  | BooleanOperators;

export type QueryFilter = {
  type: FilterType;
  field: string;
  fieldLabel: string;
  isNullable?: boolean;
  /**
   * Indicates that this field path traverses a collection (1:N or N:N relation).
   * When true, the filter will use `{ quantifier: "some" }` to properly query nested arrays.
   *
   * @example
   * ```typescript
   * // For a User with posts collection:
   * { field: "posts.title", type: "string", fieldLabel: "Post Title", isCollection: true }
   * ```
   */
  isCollection?: boolean;
  multiSelect?: boolean;
  options?: {
    label: string;
    value: string;
    icon?: React.ReactNode;
  }[];
};

export type FilterValue = {
  field: string;
  operator: FilterOperator;
  value:
    | string
    | string[]
    | number
    | number[]
    | boolean
    | Date
    | [Date, Date]
    | null;
};

export type OperatorLabels = Record<FilterOperator, string>;
export const OPERATOR_LABELS: OperatorLabels = {
  equals: "equals",
  notEquals: "not equals",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
  in: "has any of",
  notIn: "has none of",
  greaterThan: "greater than",
  greaterThanOrEqual: "greater or equal",
  lessThan: "less than",
  lessThanOrEqual: "less or equal",
  between: "between",
  isNull: "is empty",
  isNotNull: "is not empty",
};

export function defineDefaultFilterValue(
  type: FilterType,
  operator?: FilterOperator
) {
  if (operator === "isNull" || operator === "isNotNull") {
    return null;
  }

  let defaultValue: FilterValue["value"];
  switch (type) {
    case "string": {
      defaultValue = "";
      break;
    }
    case "number": {
      defaultValue = 0;
      break;
    }
    case "date": {
      defaultValue = null;
      break;
    }
    case "boolean": {
      defaultValue = false;
      break;
    }
    default: {
      defaultValue = null;
      break;
    }
  }
  return defaultValue;
}

export function getOperatorsByType(type: FilterType): FilterOperator[] {
  switch (type) {
    case "string":
      return STRING_OPERATORS;
    case "number":
      return NUMBER_OPERATORS;
    case "date":
      return DATE_OPERATORS;
    case "boolean":
      return BOOLEAN_OPERATORS;
  }
}

export function getDefaultOperator(type: FilterType): FilterOperator {
  switch (type) {
    case "string":
      return "equals";
    case "number":
      return "equals";
    case "date":
      return "equals";
    case "boolean":
      return "equals";
  }
}

export function operatorRequiresValue(operator: FilterOperator): boolean {
  return operator !== "isNull" && operator !== "isNotNull";
}

export function operatorSupportsMultipleValues(
  operator: FilterOperator
): boolean {
  return operator === "in" || operator === "notIn";
}

export function operatorIsBetween(operator: FilterOperator): boolean {
  return operator === "between";
}
