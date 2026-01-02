import type { Aggregate } from "@woltz/rich-domain";

/**
 * Extract property keys from an Aggregate type by using the toJSON return type
 * This utility type extracts only the property keys from the JSON representation,
 * avoiding methods from the Aggregate class.
 *
 * @template T - The Aggregate type
 */
export type PropsOf<T> = T extends { toJSON(): infer R }
  ? keyof R
  : T extends Aggregate<infer P>
  ? keyof P
  : never;

/**
 * Configuration options for CSV export operations
 *
 * @template T - The domain entity type being exported
 */
export interface CsvExportOptions<T extends Aggregate<any>> {
  /**
   * Selected columns to export. If not provided, exports all fields from the first entity.
   *
   * @example
   * ```typescript
   * columns: ["name", "email", "status"]
   * ```
   */
  columns?: PropsOf<T>[];

  /**
   * Custom column headers. Maps field names to display names.
   * If not provided, uses the field name as header.
   *
   * @example
   * ```typescript
   * headers: {
   *   name: "Full Name",
   *   email: "Email Address",
   *   createdAt: "Registration Date"
   * }
   * ```
   */
  headers?: Partial<Record<PropsOf<T>, string>>;

  /**
   * CSV delimiter character
   *
   * @default ","
   */
  delimiter?: string;

  /**
   * Include header row in the CSV output
   *
   * @default true
   */
  includeHeaders?: boolean;

  /**
   * Batch size for streaming large datasets.
   * Only applies to `exportToCSVStream()` method.
   *
   * @default 1000
   */
  batchSize?: number;

  /**
   * Custom formatter functions for specific fields.
   * Allows transforming field values before CSV serialization.
   *
   * @example
   * ```typescript
   * formatters: {
   *   createdAt: (date) => new Date(date).toLocaleDateString("en-US"),
   *   price: (value) => `$${value.toFixed(2)}`
   * }
   * ```
   */
  formatters?: Partial<Record<PropsOf<T>, (value: any) => string>>;
}

/**
 * Result of CSV export validation
 */
export interface CsvValidationResult {
  /**
   * Whether the export options are valid
   */
  isValid: boolean;

  /**
   * List of validation error messages
   */
  errors: string[];

  /**
   * List of validation warning messages (non-critical)
   */
  warnings?: string[];
}

/**
 * Progress callback for long-running exports
 *
 * @param processed - Number of entities processed so far
 * @param total - Total number of entities to export
 */
export type ExportProgressCallback = (processed: number, total: number) => void;

/**
 * CSV export statistics
 */
export interface CsvExportStats {
  /**
   * Total number of entities exported
   */
  totalRecords: number;

  /**
   * Number of columns exported
   */
  totalColumns: number;

  /**
   * Size of the CSV output in bytes
   */
  sizeInBytes: number;

  /**
   * Time taken to export (in milliseconds)
   */
  durationMs: number;

  /**
   * Whether any warnings were encountered
   */
  hasWarnings: boolean;

  /**
   * List of warning messages
   */
  warnings: string[];
}
