import type { Readable } from "stream";
import type {
  BaseExportOptions,
  BaseExportStats,
  ExportResult,
  ExportProgressCallback,
  ValidationResult,
} from "./types.js";

/**
 * Base interface that all export format strategies must implement
 *
 * This enables the Strategy Pattern for different export formats.
 * Each format (CSV, JSON, Excel, etc.) implements this interface
 * to provide format-specific export logic.
 *
 * @template TOptions - Format-specific export options
 * @template TStats - Format-specific export statistics
 *
 * @example
 * ```typescript
 * class CsvFormatStrategy<T>
 *   implements ExportFormatStrategy<T, CsvExportOptions<T>, CsvExportStats>
 * {
 *   async export(records: any[], options: CsvExportOptions<T>) {
 *     // CSV export implementation
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface ExportFormatStrategy<
  TOptions extends BaseExportOptions = BaseExportOptions,
  TStats extends BaseExportStats = BaseExportStats,
> {
  /**
   * Export entities to the format as a string/buffer
   *
   * For in-memory exports suitable for small-medium datasets.
   * Returns the complete export data and statistics.
   *
   * @param records - Array of records (plain objects from entity.toJSON())
   * @param options - Format-specific export options
   * @param onProgress - Optional progress callback
   * @returns Export result with data and statistics
   *
   * @example
   * ```typescript
   * const result = await strategy.export(records, options, (processed, total) => {
   *   console.log(`Progress: ${processed}/${total}`);
   * });
   * console.log(`Exported ${result.stats.totalRecords} records`);
   * ```
   */
  export(
    records: any[],
    options: TOptions,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult<TStats>>;

  /**
   * Export entities to the format as a stream
   *
   * For large datasets requiring memory-efficient processing.
   * Returns a Readable stream that can be piped to a file or HTTP response.
   *
   * @param recordsIterator - Async iterable of record batches
   * @param options - Format-specific export options
   * @returns Readable stream of export data
   *
   * @example
   * ```typescript
   * const stream = await strategy.exportStream(recordsIterator, options);
   * stream.pipe(fs.createWriteStream("output.csv"));
   * ```
   */
  exportStream(
    recordsIterator: AsyncIterable<any[]>,
    options: TOptions
  ): Promise<Readable>;

  /**
   * Validate export options before export
   *
   * Checks if the provided options are valid for this format.
   * Can optionally use a sample record to validate field names.
   *
   * @param options - Format-specific export options
   * @param sampleRecord - Optional sample record for field validation
   * @returns Validation result with errors and warnings
   *
   * @example
   * ```typescript
   * const validation = strategy.validateOptions(options, records[0]);
   * if (!validation.isValid) {
   *   throw new Error(validation.errors.join(", "));
   * }
   * ```
   */
  validateOptions(options: TOptions, sampleRecord?: any): ValidationResult;

  /**
   * Get the MIME type for this format
   *
   * Used for HTTP response headers when streaming exports.
   *
   * @returns MIME type (e.g., "text/csv", "application/json")
   *
   * @example
   * ```typescript
   * reply
   *   .header("Content-Type", strategy.getMimeType())
   *   .send(stream);
   * ```
   */
  getMimeType(): string;

  /**
   * Get the file extension for this format
   *
   * Used for file naming when saving exports.
   *
   * @returns File extension without dot (e.g., "csv", "json", "xlsx")
   *
   * @example
   * ```typescript
   * const filename = `export_${Date.now()}.${strategy.getFileExtension()}`;
   * ```
   */
  getFileExtension(): string;

  /**
   * Get the format name
   *
   * Returns a human-readable name for this format.
   *
   * @returns Format name (e.g., "csv", "json", "excel")
   */
  getFormatName(): string;
}
