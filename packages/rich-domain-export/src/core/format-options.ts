import type { Aggregate } from "@woltz/rich-domain";
import type { BaseExportOptions, PropsOf } from "./types.js";

/**
 * CSV-specific export options
 *
 * Extends base options with CSV-specific fields like columns,
 * headers, delimiter, and formatters.
 *
 * @template T - Aggregate type being exported
 */
export interface CsvExportOptions<
  T extends Aggregate<any>,
> extends BaseExportOptions {
  /**
   * Format discriminator for type-safe format selection
   */
  format: "csv";

  /**
   * Columns to include in the export
   * If not provided, all properties from the first record will be used
   */
  columns?: PropsOf<T>[];

  /**
   * Custom header labels for columns
   * Maps property names to human-readable headers
   *
   * @example
   * { email: "Email Address", createdAt: "Registration Date" }
   */
  headers?: Partial<Record<PropsOf<T>, string>>;

  /**
   * Delimiter character for CSV
   * @default ","
   */
  delimiter?: string;

  /**
   * Include header row in CSV output
   * @default true
   */
  includeHeaders?: boolean;

  /**
   * Custom formatters for field values
   * Maps property names to formatter functions that convert values to strings
   *
   * @example
   * {
   *   createdAt: (date) => new Date(date).toLocaleDateString(),
   *   amount: (num) => `$${num.toFixed(2)}`
   * }
   */
  formatters?: Partial<Record<PropsOf<T>, (value: any) => string>>;
}

/**
 * JSON-specific export options
 *
 * Extends base options with JSON-specific fields like pretty printing,
 * JSON Lines format, field selection, and transformers.
 *
 * @template T - Aggregate type being exported
 */
export interface JsonExportOptions<
  T extends Aggregate<any>,
> extends BaseExportOptions {
  /**
   * Format discriminator for type-safe format selection
   */
  format: "json";

  /**
   * Pretty print JSON with indentation
   * @default false
   */
  pretty?: boolean;

  /**
   * Number of spaces for indentation (when pretty is true)
   * @default 2
   */
  indent?: number;

  /**
   * Export as JSON Lines (newline-delimited JSON) instead of JSON array
   *
   * JSON Lines format:
   * - Each line is a valid JSON object
   * - Better for streaming large datasets
   * - Supported by many data processing tools
   *
   * @default false
   *
   * @see https://jsonlines.org/
   */
  jsonLines?: boolean;

  /**
   * Selected fields to include in JSON output
   * If not provided, all fields from the record will be included
   *
   * Similar to CSV columns but for JSON field selection
   */
  fields?: PropsOf<T>[];

  /**
   * Field transformers for JSON values
   *
   * Similar to CSV formatters but can return any JSON-serializable type,
   * not just strings. This enables richer transformations like nested objects.
   *
   * @example
   * {
   *   tags: (tags) => tags.join(", "),
   *   metadata: (meta) => ({ ...meta, exported: true }),
   *   amount: (num) => Number(num.toFixed(2))
   * }
   */
  transformers?: Partial<Record<PropsOf<T>, (value: any) => any>>;

  /**
   * Wrap output in a root key
   *
   * When set, the JSON array will be wrapped in an object:
   * { "rootKey": [...records] }
   *
   * Useful for API responses that expect a specific structure.
   *
   * @example
   * rootKey: "users" → { "users": [...] }
   */
  rootKey?: string;
}

/**
 * Union type of all format options
 *
 * This discriminated union enables type-safe format selection.
 * TypeScript will enforce that only valid options for the selected
 * format can be used.
 *
 * @template T - Aggregate type being exported
 *
 * @example
 * ```typescript
 * // TypeScript knows these are CSV options
 * const options: ExportOptions<User> = {
 *   format: "csv",
 *   columns: ["name", "email"],  // ✓ Valid for CSV
 *   delimiter: ","               // ✓ Valid for CSV
 * };
 *
 * // TypeScript prevents mixing formats
 * const invalid: ExportOptions<User> = {
 *   format: "csv",
 *   pretty: true  // ✗ Error: 'pretty' doesn't exist on CSV options
 * };
 * ```
 */
export type ExportOptions<T extends Aggregate<any>> =
  | CsvExportOptions<T>
  | JsonExportOptions<T>;

/**
 * Helper type to extract options for a specific format
 *
 * Useful when you know the format at compile time and want
 * the specific options type.
 *
 * @template T - Aggregate type being exported
 * @template F - Format name ("csv" | "json")
 *
 * @example
 * ```typescript
 * type CsvOpts = OptionsForFormat<User, "csv">;
 * // CsvOpts = CsvExportOptions<User>
 *
 * type JsonOpts = OptionsForFormat<User, "json">;
 * // JsonOpts = JsonExportOptions<User>
 * ```
 */
export type OptionsForFormat<
  T extends Aggregate<any>,
  F extends ExportOptions<T>["format"],
> = Extract<ExportOptions<T>, { format: F }>;
