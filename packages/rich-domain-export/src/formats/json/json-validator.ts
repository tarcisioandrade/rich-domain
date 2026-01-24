import type { Aggregate } from "@woltz/rich-domain";
import type { JsonExportOptions } from "../../core/format-options.js";
import type { ValidationResult } from "../../core/types.js";

/**
 * Validate JSON export options
 *
 * Checks if the provided options are valid for JSON export.
 * Optionally validates field names against a sample record.
 *
 * @param options - JSON export options to validate
 * @param sampleRecord - Optional sample record for field validation
 * @returns Validation result with errors and warnings
 */
export function validateJsonExportOptions<T extends Aggregate<any>>(
  options: JsonExportOptions<T>,
  sampleRecord?: any
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate indent
  if (options.indent !== undefined) {
    if (typeof options.indent !== "number") {
      errors.push("Indent must be a number");
    } else if (options.indent < 0) {
      errors.push("Indent must be non-negative");
    } else if (options.indent > 10) {
      warnings.push(
        "Large indent values (>10) may significantly increase file size"
      );
    }
  }

  // Validate pretty and indent combination
  if (options.pretty === false && options.indent !== undefined) {
    warnings.push("Indent option is ignored when pretty is false");
  }

  // Validate batch size
  if (options.batchSize !== undefined) {
    if (typeof options.batchSize !== "number") {
      errors.push("Batch size must be a number");
    } else if (options.batchSize < 1) {
      errors.push("Batch size must be greater than 0");
    }
  }

  // Validate fields against sample record
  if (options.fields && options.fields.length > 0 && sampleRecord) {
    const availableFields = Object.keys(sampleRecord);

    for (const field of options.fields) {
      if (!availableFields.includes(field as string)) {
        errors.push(
          `Field "${String(field)}" does not exist in the record. Available fields: ${availableFields.join(", ")}`
        );
      }
    }

    // Warn if no fields will be exported
    if (options.fields.length === 0) {
      warnings.push("No fields specified - export will be empty");
    }
  }

  // Validate transformers
  if (options.transformers && sampleRecord) {
    const availableFields = Object.keys(sampleRecord);

    for (const field of Object.keys(options.transformers)) {
      if (!availableFields.includes(field)) {
        warnings.push(
          `Transformer for field "${field}" will have no effect - field does not exist in record`
        );
      }

      const transformer =
        options.transformers[field as keyof typeof options.transformers];
      if (typeof transformer !== "function") {
        errors.push(`Transformer for field "${field}" must be a function`);
      }
    }
  }

  // Validate rootKey
  if (options.rootKey !== undefined) {
    if (typeof options.rootKey !== "string") {
      errors.push("Root key must be a string");
    } else if (options.rootKey.trim().length === 0) {
      errors.push("Root key cannot be empty");
    }
  }

  // Warn about pretty printing and file size
  if (options.pretty === true && !options.jsonLines) {
    warnings.push(
      "Pretty printing significantly increases file size. Consider using jsonLines for large exports."
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check if a value is a valid transformer function
 *
 * @param transformer - Value to check
 * @returns True if value is a valid transformer function
 */
export function isValidTransformer(transformer: any): transformer is Function {
  return typeof transformer === "function";
}
