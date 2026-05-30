import {
  ArrayOperators,
  BooleanOperators,
  DateOperators,
  FilterOperator,
  NumberOperators,
  StringOperators,
  ValidationConfig,
} from ".";

export const DEFAULT_VALIDATION_CONFIG: Required<ValidationConfig> = {
  onCreate: true,
  onUpdate: true,
  throwOnError: true,
  lockMutationsWhenInvalid: false,
};

export const ARRAY_OPERATORS: ArrayOperators[] = [
  "in",
  "notIn",
  "isNull",
  "isNotNull",
];
export const BOOLEAN_OPERATORS: BooleanOperators[] = [
  "equals",
  "notEquals",
  "isNull",
  "isNotNull",
];
export const DATE_OPERATORS: DateOperators[] = [
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
export const NUMBER_OPERATORS: NumberOperators[] = [
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
export const STRING_OPERATORS: StringOperators[] = [
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
export const FILTER_OPERATORS: FilterOperator[] = [
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "contains",
  "startsWith",
  "endsWith",
  "in",
  "notIn",
  "between",
  "isNull",
  "isNotNull",
];
