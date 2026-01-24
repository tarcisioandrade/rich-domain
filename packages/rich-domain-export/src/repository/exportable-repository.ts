import { Repository, Criteria, Aggregate } from "@woltz/rich-domain";
import type { Readable } from "stream";
import type { ExportOptions } from "../core/format-options.js";
import type { ExportResult, ExportProgressCallback } from "../core/types.js";
import { ExportService } from "../services/export-service.js";

/**
 * Abstract repository with multi-format export capabilities
 *
 * Extends the base Repository class from rich-domain with methods to export
 * entities to multiple formats (CSV, JSON, and any custom registered formats).
 *
 * @template TDomain - Domain aggregate type
 *
 * @example
 * ```typescript
 * class UserRepository extends ExportableRepository<User> {
 *   // Your repository implementation
 * }
 *
 * // Export as CSV
 * const result = await userRepository.export(criteria, {
 *   format: "csv",
 *   columns: ["name", "email"]
 * });
 *
 * // Export as JSON
 * const result = await userRepository.export(criteria, {
 *   format: "json",
 *   pretty: true,
 *   fields: ["name", "email"]
 * });
 * ```
 */
export abstract class ExportableRepository<
  TDomain extends Aggregate<any>,
> extends Repository<TDomain> {
  /**
   * Export service instance (composition pattern)
   * @private
   */
  private readonly exportService = new ExportService();

  /**
   * Export entities in the specified format
   *
   * This method fetches all matching entities and converts them to the
   * specified format. For large datasets, consider using `exportStream()` instead.
   *
   * @param criteria - Filter, sort, and pagination criteria
   * @param options - Export configuration (format + format-specific options)
   * @param onProgress - Optional progress callback
   * @returns Export result with data and statistics
   * @throws {ValidationError} If export options are invalid
   * @throws {FormatterError} If a custom formatter/transformer fails
   * @throws {ExportOperationError} If export operation fails
   *
   * @example
   * ```typescript
   * // Export as CSV
   * const { data, stats } = await userRepository.export(
   *   Criteria.create<User>().where("status", "equals", "active"),
   *   {
   *     format: "csv",
   *     columns: ["name", "email", "createdAt"],
   *     headers: {
   *       name: "Full Name",
   *       email: "Email Address",
   *       createdAt: "Registration Date"
   *     },
   *     formatters: {
   *       createdAt: (date) => new Date(date).toLocaleDateString()
   *     }
   *   }
   * );
   *
   * console.log(`Exported ${stats.totalRecords} users`);
   * fs.writeFileSync("users.csv", data);
   *
   * // Export as JSON
   * const { data, stats } = await userRepository.export(
   *   criteria,
   *   {
   *     format: "json",
   *     pretty: true,
   *     fields: ["name", "email"],
   *     transformers: {
   *       email: (email) => email.toLowerCase()
   *     }
   *   }
   * );
   *
   * fs.writeFileSync("users.json", data);
   * ```
   */
  async export(
    criteria: Criteria<TDomain> | undefined,
    options: ExportOptions<TDomain>,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    return this.exportService.export(this, criteria, options, onProgress);
  }

  /**
   * Export entities as a stream for large datasets
   *
   * This method processes entities in batches, making it memory-efficient
   * for large datasets. Ideal for streaming directly to HTTP responses or files.
   *
   * @param criteria - Filter, sort, and pagination criteria
   * @param options - Export configuration
   * @returns Readable stream of export data
   * @throws {ValidationError} If export options are invalid
   * @throws {ExportOperationError} If export operation fails
   *
   * @example
   * ```typescript
   * // Stream CSV to file
   * const stream = await userRepository.exportStream(
   *   criteria,
   *   { format: "csv", batchSize: 1000 }
   * );
   * stream.pipe(fs.createWriteStream("users.csv"));
   *
   * // Stream JSON Lines to HTTP response (Fastify)
   * const stream = await userRepository.exportStream(
   *   criteria,
   *   { format: "json", jsonLines: true, batchSize: 500 }
   * );
   * reply
   *   .header("Content-Type", "application/x-ndjson")
   *   .header("Content-Disposition", 'attachment; filename="users.jsonl"')
   *   .send(stream);
   *
   * // Stream pretty JSON to Express response
   * const stream = await userRepository.exportStream(
   *   criteria,
   *   { format: "json", pretty: true }
   * );
   * res.setHeader("Content-Type", "application/json");
   * stream.pipe(res);
   * ```
   */
  async exportStream(
    criteria: Criteria<TDomain> | undefined,
    options: ExportOptions<TDomain>
  ): Promise<Readable> {
    return this.exportService.exportStream(this, criteria, options);
  }
}
