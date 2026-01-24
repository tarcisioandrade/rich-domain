import type { Aggregate } from "@woltz/rich-domain";

/**
 * Extract property keys from an Aggregate type using toJSON
 *
 * This utility type introspects the Aggregate's toJSON() method
 * to determine what properties will be available in the exported record.
 *
 * @example
 * ```typescript
 * class User extends Aggregate<{ name: string; email: string }> {}
 * type UserProps = PropsOf<User>; // "name" | "email"
 * ```
 */
export type PropsOf<T> = T extends { toJSON(): infer R }
  ? keyof R
  : T extends Aggregate<infer P>
    ? keyof P
    : never;

/**
 * Base export options shared across all export formats
 *
 * These options are common to all formats and can be extended
 * with format-specific options in the discriminated union.
 */
export interface BaseExportOptions {
  /**
   * Include metadata in the export (timestamps, version, etc.)
   * @default false
   */
  includeMetadata?: boolean;

  /**
   * Batch size for streaming large datasets
   * Controls how many records are fetched from the repository per batch
   * @default 1000
   */
  batchSize?: number;

  /**
   * Custom record transformer
   * Allows converting entities to custom format before export
   * Applied before format-specific transformations
   */
  recordTransformer?: (record: any) => any;
}

/**
 * Base export statistics provided by all formats
 *
 * Format-specific strategies can extend this interface
 * to provide additional format-specific statistics.
 */
export interface BaseExportStats {
  /**
   * Total number of records exported
   */
  totalRecords: number;

  /**
   * Size of the export output in bytes
   */
  sizeInBytes: number;

  /**
   * Time taken to export (in milliseconds)
   */
  durationMs: number;

  /**
   * Whether any warnings were encountered during export
   */
  hasWarnings: boolean;

  /**
   * List of warning messages
   */
  warnings: string[];

  /**
   * Export format used
   */
  format: string;
}

/**
 * Result of an export operation
 *
 * Contains the exported data and statistics about the export.
 *
 * @template TStats - Format-specific statistics type
 */
export interface ExportResult<
  TStats extends BaseExportStats = BaseExportStats,
> {
  /**
   * The exported data as string or buffer
   * Format depends on the export format strategy
   */
  data: string | Buffer;

  /**
   * Export statistics
   */
  stats: TStats;
}

/**
 * Progress callback for long-running exports
 *
 * Called periodically during export to report progress.
 * Useful for UI progress bars or logging.
 *
 * @param processed - Number of records processed so far
 * @param total - Total number of records to process
 *
 * @example
 * ```typescript
 * const onProgress: ExportProgressCallback = (processed, total) => {
 *   const percentage = (processed / total) * 100;
 *   console.log(`Export progress: ${percentage.toFixed(1)}%`);
 * };
 * ```
 */
export type ExportProgressCallback = (processed: number, total: number) => void;

/**
 * Result of export options validation
 *
 * Used by format strategies to validate options before export.
 */
export interface ValidationResult {
  /**
   * Whether the options are valid
   */
  isValid: boolean;

  /**
   * List of validation error messages
   */
  errors: string[];

  /**
   * Optional list of warning messages
   */
  warnings?: string[];
}
