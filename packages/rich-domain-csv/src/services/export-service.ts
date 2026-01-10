import type { Aggregate, Repository } from "@woltz/rich-domain";
import { Criteria } from "@woltz/rich-domain";
import type { Readable } from "stream";
import type { ExportOptions } from "../core/format-options.js";
import type { ExportResult, ExportProgressCallback } from "../core/types.js";
import { ValidationError } from "../core/errors.js";
import { FormatRegistry } from "./format-registry.js";
import { entitiesToRecords, createRecordIterator } from "../utils/entity-converter.js";

/**
 * Universal export service supporting multiple formats
 *
 * Uses composition pattern - works with any Repository without inheritance.
 * Supports all registered formats through the Strategy Pattern.
 *
 * @example
 * ```typescript
 * const exportService = new ExportService();
 *
 * // Export as CSV
 * const result = await exportService.export(
 *   userRepository,
 *   criteria,
 *   { format: "csv", columns: ["name", "email"] }
 * );
 *
 * // Export as JSON
 * const result = await exportService.export(
 *   userRepository,
 *   criteria,
 *   { format: "json", pretty: true, fields: ["name", "email"] }
 * );
 * ```
 */
export class ExportService {
  /**
   * Export entities from a repository in the specified format
   *
   * Fetches all matching entities and exports them using the specified format strategy.
   * Suitable for small to medium datasets that fit in memory.
   *
   * @param repository - Repository to export from
   * @param criteria - Filter, sort, and pagination criteria
   * @param options - Export configuration (format + format-specific options)
   * @param onProgress - Optional progress callback
   * @returns Export result with data and statistics
   * @throws {ValidationError} If export options are invalid
   * @throws {ExportOperationError} If export operation fails
   *
   * @example
   * ```typescript
   * const service = new ExportService();
   *
   * // Export as CSV
   * const { data, stats } = await service.export(
   *   userRepository,
   *   Criteria.create<User>().where("status", "equals", "active"),
   *   { format: "csv", columns: ["name", "email"] },
   *   (processed, total) => console.log(`${processed}/${total}`)
   * );
   *
   * console.log(`Exported ${stats.totalRecords} records in ${stats.durationMs}ms`);
   * fs.writeFileSync("users.csv", data);
   * ```
   */
  async export<T extends Aggregate<any>>(
    repository: Repository<T>,
    criteria: Criteria<T> | undefined,
    options: ExportOptions<T>,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    // Get strategy for the specified format
    const strategy = FormatRegistry.getStrategy(options.format);

    // Fetch all entities (removes pagination to get all matching records)
    const exportCriteria = this.prepareCriteria(criteria);
    const result = await repository.find(exportCriteria);
    const records = entitiesToRecords(result.data);

    // Validate options with sample record
    const validation = strategy.validateOptions(options, records[0]);
    if (!validation.isValid) {
      throw new ValidationError(
        `Export validation failed for format "${options.format}"`,
        validation.errors
      );
    }

    // Export using strategy
    return strategy.export(records, options, onProgress);
  }

  /**
   * Export entities as a stream for large datasets
   *
   * Processes entities in batches, making it memory-efficient for large datasets.
   * Ideal for streaming directly to HTTP responses or files.
   *
   * @param repository - Repository to export from
   * @param criteria - Filter, sort, and pagination criteria
   * @param options - Export configuration
   * @returns Readable stream of export data
   * @throws {ValidationError} If export options are invalid
   * @throws {ExportOperationError} If export operation fails
   *
   * @example
   * ```typescript
   * const service = new ExportService();
   *
   * // Stream CSV export to file
   * const stream = await service.exportStream(
   *   userRepository,
   *   criteria,
   *   { format: "csv", batchSize: 1000 }
   * );
   * stream.pipe(fs.createWriteStream("users.csv"));
   *
   * // Stream JSON Lines to HTTP response (Fastify)
   * const stream = await service.exportStream(
   *   userRepository,
   *   criteria,
   *   { format: "json", jsonLines: true }
   * );
   * reply
   *   .header("Content-Type", service.getMimeType("json"))
   *   .header("Content-Disposition", 'attachment; filename="users.jsonl"')
   *   .send(stream);
   * ```
   */
  async exportStream<T extends Aggregate<any>>(
    repository: Repository<T>,
    criteria: Criteria<T> | undefined,
    options: ExportOptions<T>
  ): Promise<Readable> {
    // Get strategy for the specified format
    const strategy = FormatRegistry.getStrategy(options.format);
    const batchSize = options.batchSize ?? 1000;

    // Create async iterator for batched records
    const recordsIterator = createRecordIterator(
      repository,
      criteria,
      batchSize
    );

    // Export stream using strategy
    return strategy.exportStream(recordsIterator, options);
  }

  /**
   * Get MIME type for a format
   *
   * Returns the MIME type for the specified format, useful for setting
   * HTTP response headers.
   *
   * @param format - Format name (e.g., "csv", "json")
   * @returns MIME type (e.g., "text/csv", "application/json")
   *
   * @example
   * ```typescript
   * const mimeType = service.getMimeType("csv");
   * reply.header("Content-Type", mimeType);
   * ```
   */
  getMimeType(format: string): string {
    const strategy = FormatRegistry.getStrategy(format);
    return strategy.getMimeType();
  }

  /**
   * Get file extension for a format
   *
   * Returns the file extension for the specified format, useful for
   * generating filenames.
   *
   * @param format - Format name (e.g., "csv", "json")
   * @returns File extension without dot (e.g., "csv", "json")
   *
   * @example
   * ```typescript
   * const ext = service.getFileExtension("csv");
   * const filename = `export_${Date.now()}.${ext}`;
   * ```
   */
  getFileExtension(format: string): string {
    const strategy = FormatRegistry.getStrategy(format);
    return strategy.getFileExtension();
  }

  /**
   * Prepare criteria for export
   *
   * Removes pagination and sets it to fetch all matching records.
   * This ensures the export includes all entities, not just a single page.
   *
   * @param criteria - Original criteria
   * @returns Criteria configured to fetch all records
   * @private
   */
  private prepareCriteria<T extends Aggregate<any>>(
    criteria?: Criteria<T>
  ): Criteria<T> {
    if (!criteria) {
      return Criteria.create<T>().paginate(1, Number.MAX_SAFE_INTEGER);
    }

    return criteria.clone().paginate(1, Number.MAX_SAFE_INTEGER);
  }
}
