import type { Aggregate } from "@woltz/rich-domain";
import type { CsvExportOptions, CsvValidationResult, PropsOf } from "../types";

/**
 * Validates CSV export options before export operation
 * 
 * @param options - Export configuration to validate
 * @param sampleData - Optional sample entity to validate column existence
 * @returns Validation result with errors and warnings
 * 
 * @example
 * ```typescript
 * const validation = validateCsvExportOptions(options, users[0]);
 * 
 * if (!validation.isValid) {
 *   throw new Error(validation.errors.join(", "));
 * }
 * 
 * if (validation.warnings?.length) {
 *   console.warn("Export warnings:", validation.warnings);
 * }
 * ```
 */
export function validateCsvExportOptions<T extends Aggregate<any>>(
  options: CsvExportOptions<T>,
  sampleData?: any | null
): CsvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (options.delimiter !== undefined) {
    if (options.delimiter.length !== 1) {
      errors.push("Delimiter must be a single character");
    }

    if (options.delimiter === "\n" || options.delimiter === "\r") {
      errors.push("Delimiter cannot be a newline character");
    }
  }

  if (options.batchSize !== undefined) {
    if (options.batchSize < 1) {
      errors.push("Batch size must be greater than 0");
    }

    if (options.batchSize > 10000) {
      warnings.push(
        "Large batch size (>10000) may cause memory issues for very large datasets"
      );
    }
  }

  if (options.columns && sampleData) {
    const sampleJson =
      typeof sampleData === "object" && "toJSON" in sampleData
        ? (sampleData as any).toJSON()
        : sampleData;

    const availableFields = new Set(Object.keys(sampleJson));

    for (const column of options.columns) {
      const columnStr = String(column);
      if (!availableFields.has(columnStr)) {
        errors.push(`Column "${columnStr}" does not exist in entity`);
      }
    }
  }

  if (options.headers && options.columns) {
    for (const headerKey of Object.keys(options.headers)) {
      if (!options.columns.includes(headerKey as PropsOf<T>)) {
        warnings.push(
          `Header defined for "${headerKey}" but column is not in selected columns`
        );
      }
    }
  }

  if (options.formatters && options.columns) {
    for (const formatterKey of Object.keys(options.formatters)) {
      if (!options.columns.includes(formatterKey as PropsOf<T>)) {
        warnings.push(
          `Formatter defined for "${formatterKey}" but column is not in selected columns`
        );
      }
    }
  }

  if (options.columns && options.columns.length === 0) {
    errors.push("Columns array cannot be empty");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates if a formatter function is safe to use
 *
 * @param formatter - Formatter function to validate
 * @returns True if formatter is valid
 */
export function isValidFormatter(formatter: any): formatter is (value: any) => string {
  return typeof formatter === "function";
}

/**
 * Validates delimiter character
 * 
 * @param delimiter - Delimiter to validate
 * @returns True if delimiter is valid
 */
export function isValidDelimiter(delimiter: string): boolean {
  if (delimiter.length !== 1) {
    return false;
  }

  const invalidChars = ["\n", "\r", "\0"];
  return !invalidChars.includes(delimiter);
}