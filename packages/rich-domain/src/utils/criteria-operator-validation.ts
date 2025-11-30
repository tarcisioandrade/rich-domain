import {
  ArrayOperators,
  BooleanOperators,
  DateOperators,
  FILTER_OPERATORS,
  FilterOperator,
  NumberOperators,
  StringOperators,
} from "../types";

export function isValidOperatorForType(
  value: unknown,
  operator: FilterOperator
): boolean {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return ["isNull", "isNotNull", "equals", "notEquals"].includes(operator);
  }

  // Special case: between operator with array [min, max]
  if (operator === "between" && Array.isArray(value) && value.length === 2) {
    // Validate based on the type of the first element
    const elementType = typeof value[0];
    if (elementType === "number" || value[0] instanceof Date) {
      return true;
    }
    return false;
  }

  const valueType = typeof value;

  // String operators
  if (valueType === "string" && Number.isNaN(Number(value))) {
    const validOps: StringOperators[] = [
      "equals",
      "notEquals",
      "contains",
      "startsWith",
      "endsWith",
      "in",
      "notIn",
      "isNull",
      "isNotNull",
    ];
    return validOps.includes(operator as StringOperators);
  }

  // Number operators
  if (valueType === "number") {
    const validOps: NumberOperators[] = [
      "equals",
      "notEquals",
      "greaterThan",
      "greaterThanOrEqual",
      "lessThan",
      "lessThanOrEqual",
      "in",
      "notIn",
      "between",
      "isNull",
      "isNotNull",
    ];
    return validOps.includes(operator as NumberOperators);
  }

  // Boolean operators
  if (valueType === "boolean") {
    const validOps: BooleanOperators[] = [
      "equals",
      "notEquals",
      "isNull",
      "isNotNull",
    ];
    return validOps.includes(operator as BooleanOperators);
  }

  // Date operators
  if (value instanceof Date) {
    const validOps: DateOperators[] = [
      "equals",
      "notEquals",
      "greaterThan",
      "greaterThanOrEqual",
      "lessThan",
      "lessThanOrEqual",
      "in",
      "notIn",
      "between",
      "isNull",
      "isNotNull",
    ];
    return validOps.includes(operator as DateOperators);
  }

  // Array operators
  if (Array.isArray(value)) {
    const validOps: ArrayOperators[] = ["in", "notIn", "isNull", "isNotNull"];
    return validOps.includes(operator as ArrayOperators);
  }

  // For unknown types, allow all operators
  return true;
}

export function getValidOperatorsForType(value: unknown): FilterOperator[] {
  if (value === null || value === undefined) {
    return ["isNull", "isNotNull", "equals", "notEquals"];
  }

  const valueType = typeof value;

  if (valueType === "string" && Number.isNaN(Number(value))) {
    return [
      "equals",
      "notEquals",
      "contains",
      "startsWith",
      "endsWith",
      "in",
      "notIn",
      "isNull",
      "isNotNull",
    ];
  }

  if (valueType === "number") {
    return [
      "equals",
      "notEquals",
      "greaterThan",
      "greaterThanOrEqual",
      "lessThan",
      "lessThanOrEqual",
      "in",
      "notIn",
      "between",
      "isNull",
      "isNotNull",
    ];
  }

  if (valueType === "boolean") {
    return ["equals", "notEquals", "isNull", "isNotNull"];
  }

  if (value instanceof Date) {
    return [
      "equals",
      "notEquals",
      "greaterThan",
      "greaterThanOrEqual",
      "lessThan",
      "lessThanOrEqual",
      "in",
      "notIn",
      "between",
      "isNull",
      "isNotNull",
    ];
  }

  if (Array.isArray(value)) {
    return ["in", "notIn", "isNull", "isNotNull"];
  }

  return [...FILTER_OPERATORS];
}

export function isOperator(value: string): value is FilterOperator {
  return FILTER_OPERATORS.includes(value as FilterOperator);
}
