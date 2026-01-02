import { Repository, Criteria, Aggregate } from "@woltz/rich-domain";
import { Readable } from "stream";
import type { CsvExportOptions, ExportProgressCallback, PropsOf } from "./types.js";
import { validateCsvExportOptions } from "./utils/csv-validator.js";
import {
  CsvValidationError,
  CsvFormatterError,
  CsvExportOperationError,
} from "./errors.js";
import { buildDataRow, buildHeaderRow } from "./utils/csv-builder.js";

/**
 * Abstract repository with CSV export capabilities
 *
 * Extends the base Repository class from rich-domain with methods to export
 * entities to CSV format, supporting both in-memory and streaming exports.
 *
 * @template TDomain - Domain aggregate type
 *
 * @example
 * ```typescript
 * class UserRepository extends ExportableRepository<User> {
 *   // Your repository implementation
 * }
 *
 * const csv = await userRepository.exportToCSV(criteria, {
 *   columns: ["name", "email", "status"],
 *   headers: { name: "Full Name" }
 * });
 * ```
 */
export abstract class ExportableRepository<
  TDomain extends Aggregate<any>
> extends Repository<TDomain> {
  /**
   * Export entities to CSV format based on criteria
   *
   * This method fetches all matching entities and converts them to CSV format.
   * For large datasets, consider using `exportToCSVStream()` instead.
   *
   * @param criteria - Filter, sort, and pagination criteria
   * @param options - CSV export configuration
   * @param onProgress - Optional progress callback
   * @returns CSV string
   * @throws {CsvValidationError} If export options are invalid
   * @throws {CsvFormatterError} If a custom formatter fails
   * @throws {CsvExportOperationError} If export operation fails
   *
   * @example
   * ```typescript
   * const criteria = Criteria.create<User>()
   *   .where("status", "equals", "active")
   *   .orderBy("name", "asc");
   *
   * const csv = await userRepository.exportToCSV(criteria, {
   *   columns: ["name", "email", "createdAt"],
   *   headers: {
   *     name: "Full Name",
   *     email: "Email Address",
   *     createdAt: "Registration Date"
   *   },
   *   formatters: {
   *     createdAt: (date) => new Date(date).toLocaleDateString()
   *   }
   * });
   * ```
   */
  async exportToCSV(
    criteria?: Criteria<TDomain>,
    options: CsvExportOptions<TDomain> = {},
    onProgress?: ExportProgressCallback
  ): Promise<string> {
    const delimiter = options.delimiter ?? ",";
    const includeHeaders = options.includeHeaders ?? true;

    try {
      const exportCriteria = this.prepareCriteria(criteria);
      const result = await this.find(exportCriteria);
      const entities = result.data;

      if (entities.length === 0) {
        return includeHeaders
          ? buildHeaderRow([], options, delimiter)
          : "";
      }

      const records = this.entitiesToRecords(entities);

      const validation = validateCsvExportOptions(options, records[0]);
      if (!validation.isValid) {
        throw new CsvValidationError(
          "CSV export validation failed",
          validation.errors
        );
      }

      const columns = this.resolveColumns(options, records[0]);
      const rows: string[] = [];

      if (includeHeaders) {
        rows.push(buildHeaderRow(columns, options, delimiter));
      }

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const row = buildDataRow(record, columns, options, delimiter);
        rows.push(row);

        if (onProgress) {
          onProgress(i + 1, records.length);
        }
      }

      const csv = rows.join("\n");

      return csv;
    } catch (error) {
      if (
        error instanceof CsvValidationError ||
        error instanceof CsvFormatterError
      ) {
        throw error;
      }

      throw new CsvExportOperationError(
        "Failed to export to CSV",
        "convert",
        error as Error
      );
    }
  }

  /**
   * Export entities to CSV stream for large datasets
   *
   * This method processes entities in batches, making it memory-efficient
   * for large datasets. Ideal for streaming directly to HTTP responses or files.
   *
   * @param criteria - Filter, sort, and pagination criteria
   * @param options - CSV export configuration
   * @returns Readable stream of CSV data
   * @throws {CsvValidationError} If export options are invalid
   * @throws {CsvExportOperationError} If export operation fails
   *
   * @example
   * ```typescript
   * const stream = await userRepository.exportToCSVStream(criteria, {
   *   batchSize: 500
   * });
   *
   * // Fastify example
   * reply
   *   .header("Content-Type", "text/csv")
   *   .header("Content-Disposition", 'attachment; filename="users.csv"')
   *   .send(stream);
   *
   * // Node.js file example
   * stream.pipe(fs.createWriteStream("users.csv"));
   * ```
   */
  async exportToCSVStream(
    criteria?: Criteria<TDomain>,
    options: CsvExportOptions<TDomain> = {}
  ): Promise<Readable> {
    const delimiter = options.delimiter ?? ",";
    const includeHeaders = options.includeHeaders ?? true;
    const batchSize = options.batchSize ?? 1000;

    if (batchSize < 1) {
      throw new CsvValidationError("Invalid batch size", [
        "Batch size must be greater than 0",
      ]);
    }

    let currentPage = 1;
    let headerEmitted = false;
    let columns: PropsOf<TDomain>[] = [];
    let validationDone = false;

    const repository = this;

    const stream = new Readable({
      async read() {
        try {
          const batchCriteria =
            criteria?.clone().paginate(currentPage, batchSize) ??
            Criteria.create<TDomain>().paginate(currentPage, batchSize);

          const result = await repository.find(batchCriteria);

          if (!headerEmitted) {
            if (result.data.length === 0) {
              if (includeHeaders) {
                this.push(
                  buildHeaderRow([], options, delimiter) + "\n"
                );
              }
              this.push(null);
              return;
            }

            const records = repository.entitiesToRecords(result.data);
            const sampleRecord = records[0];

            if (!validationDone) {
              const validation = validateCsvExportOptions(
                options,
                sampleRecord
              );
              if (!validation.isValid) {
                this.destroy(
                  new CsvValidationError(
                    "CSV export validation failed",
                    validation.errors
                  )
                );
                return;
              }
              validationDone = true;
            }

            columns = repository.resolveColumns(options, sampleRecord);

            if (includeHeaders) {
              this.push(
                buildHeaderRow(columns, options, delimiter) + "\n"
              );
            }

            headerEmitted = true;
          }

          const records = repository.entitiesToRecords(result.data);

          for (const record of records) {
            try {
              const row = buildDataRow(
                record,
                columns,
                options,
                delimiter
              );
              this.push(row + "\n");
            } catch (error) {
              this.destroy(error as Error);
              return;
            }
          }

          if (!result.meta.hasNext) {
            this.push(null);
            return;
          }

          currentPage++;
        } catch (error) {
          this.destroy(
            new CsvExportOperationError(
              "Failed to stream CSV export",
              "stream",
              error as Error
            )
          );
        }
      },
    });

    return stream;
  }

  /**
   * Prepare criteria for export (removes pagination)
   */
  private prepareCriteria(criteria?: Criteria<TDomain>): Criteria<TDomain> {
    if (!criteria) {
      return Criteria.create<TDomain>().paginate(1, Number.MAX_SAFE_INTEGER);
    }

    return criteria.clone().paginate(1, Number.MAX_SAFE_INTEGER);
  }

  /**
   * Convert entities to plain objects using toJSON if available
   */
  private entitiesToRecords(entities: TDomain[]): any[] {
    return entities.map((entity) => {
      if (typeof (entity as any).toJSON === "function") {
        return (entity as any).toJSON();
      }
      return entity;
    });
  }

  /**
   * Resolve which columns to export
   */
  private resolveColumns(
    options: CsvExportOptions<TDomain>,
    sampleRecord: any
  ): PropsOf<TDomain>[] {
    if (options.columns && options.columns.length > 0) {
      return options.columns;
    }

    return Object.keys(sampleRecord) as PropsOf<TDomain>[];
  }
}
