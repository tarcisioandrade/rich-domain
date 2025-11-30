import {
  ArrayOperators,
  BooleanOperators,
  DateOperators,
  FILTER_OPERATORS,
  FilterOperator,
  NumberOperators,
  StringOperators,
} from "../types";

const FORCE_STRING_OPERATORS = new Set(["contains", "startsWith", "endsWith"]);

export function sanitizeFieldValue(
  value: unknown,
  operator: FilterOperator
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFieldValue(item, operator));
  }

  if (value instanceof Date) {
    return value;
  }

  const stringValue = String(value).trim();

  if (stringValue === "") {
    return "";
  }

  if (operator && FORCE_STRING_OPERATORS.has(operator)) {
    return stringValue;
  }

  if (stringValue === "true" || stringValue === "false") {
    return stringValue === "true";
  }

  const numberValue = Number(stringValue);
  if (!Number.isNaN(numberValue)) {
    return numberValue;
  }

  const dateObj = new Date(stringValue);
  if (!Number.isNaN(dateObj.getTime())) {
    return dateObj;
  }

  return stringValue;
}

export function isValidOperatorForType(
  value: unknown,
  operator: FilterOperator
): boolean {
  const sanitizedValue = sanitizeFieldValue(value, operator);

  if (
    operator === "between" &&
    Array.isArray(sanitizedValue) &&
    sanitizedValue.length === 2
  ) {
    const elementType = typeof sanitizedValue[0];
    if (elementType === "number" || sanitizedValue[0] instanceof Date) {
      return true;
    }
    return false;
  }

  const valueType = typeof sanitizedValue;

  if (valueType === "string") {
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

  if (valueType === "boolean") {
    const validOps: BooleanOperators[] = [
      "equals",
      "notEquals",
      "isNull",
      "isNotNull",
    ];
    return validOps.includes(operator as BooleanOperators);
  }

  if (sanitizedValue instanceof Date) {
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

  if (Array.isArray(sanitizedValue)) {
    const validOps: ArrayOperators[] = ["in", "notIn", "isNull", "isNotNull"];
    return validOps.includes(operator as ArrayOperators);
  }

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
