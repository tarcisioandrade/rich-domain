/**
 * Escapes a value for safe CSV output
 *
 * Handles quotes, delimiters, and newlines according to RFC 4180.
 *
 * @param value - Value to escape
 * @param delimiter - CSV delimiter character
 * @returns Escaped CSV value
 *
 * @example
 * ```typescript
 * escapeCsvValue('Hello, World')      // "Hello, World"
 * escapeCsvValue('Say "Hi"')          // "Say ""Hi"""
 * escapeCsvValue('Simple')            // Simple
 * ```
 */
export function escapeCsvValue(value: string, delimiter: string = ","): string {
  const needsEscaping =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");

  if (!needsEscaping) {
    return value;
  }

  // Escape quotes by doubling them (RFC 4180)
  const escaped = value.replace(/"/g, '""');

  return `"${escaped}"`;
}

/**
 * Formats a value for CSV export
 *
 * Handles different data types appropriately:
 * - null/undefined → empty string
 * - Date → ISO string
 * - Object/Array → JSON string
 * - Others → string representation
 *
 * @param value - Value to format
 * @param delimiter - CSV delimiter (for escaping)
 * @returns Formatted CSV value
 */
export function formatCsvValue(value: any, delimiter: string = ","): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return escapeCsvValue(value.toISOString(), delimiter);
  }

  if (Array.isArray(value)) {
    return escapeCsvValue(JSON.stringify(value), delimiter);
  }

  if (typeof value === "object") {
    return escapeCsvValue(JSON.stringify(value), delimiter);
  }

  if (typeof value === "boolean") {
    return value.toString();
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return "NaN";
    }
    if (!Number.isFinite(value)) {
      return value > 0 ? "Infinity" : "-Infinity";
    }
    return value.toString();
  }

  return escapeCsvValue(String(value), delimiter);
}

/**
 * Extracts field value from an object, supporting nested paths
 *
 * @param obj - Object to extract from
 * @param field - Field name or path
 * @returns Field value
 *
 * @example
 * ```typescript
 * extractFieldValue({ name: "John" }, "name")  // "John"
 * extractFieldValue({ user: { name: "John" } }, "user.name")  // "John"
 * ```
 */
export function extractFieldValue(obj: any, field: string | symbol): any {
  const fieldStr = String(field);

  if (fieldStr.includes(".")) {
    const parts = fieldStr.split(".");
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  return obj[fieldStr];
}

/**
 * Common CSV formatters for typical use cases
 */
export const commonFormatters = {
  /**
   * Formats date as ISO string
   */
  isoDate: (value: any): string => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  },

  /**
   * Formats date as locale date string
   */
  localeDate: (value: any): string => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString();
  },

  /**
   * Formats date as locale datetime string
   */
  localeDateTime: (value: any): string => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString();
  },

  /**
   * Formats number with 2 decimal places
   */
  decimal2: (value: any): string => {
    if (value === null || value === undefined) return "";
    return Number(value).toFixed(2);
  },

  /**
   * Formats number as currency (USD)
   */
  currencyUSD: (value: any): string => {
    if (value === null || value === undefined) return "";
    return `$${Number(value).toFixed(2)}`;
  },

  /**
   * Formats boolean as Yes/No
   */
  yesNo: (value: any): string => {
    if (value === null || value === undefined) return "";
    return value ? "Yes" : "No";
  },

  /**
   * Formats boolean as True/False
   */
  trueFalse: (value: any): string => {
    if (value === null || value === undefined) return "";
    return value ? "True" : "False";
  },

  /**
   * Formats array as comma-separated string
   */
  array: (value: any): string => {
    if (!Array.isArray(value)) return "";
    return value.join(", ");
  },

  /**
   * Formats object as JSON string
   */
  json: (value: any): string => {
    if (value === null || value === undefined) return "";
    return JSON.stringify(value);
  },

  /**
   * Uppercase formatter
   */
  uppercase: (value: any): string => {
    if (!value) return "";
    return String(value).toUpperCase();
  },

  /**
   * Lowercase formatter
   */
  lowercase: (value: any): string => {
    if (!value) return "";
    return String(value).toLowerCase();
  },

  /**
   * Trim whitespace
   */
  trim: (value: any): string => {
    if (!value) return "";
    return String(value).trim();
  },
};
