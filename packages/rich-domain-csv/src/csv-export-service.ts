import { Repository, Criteria, Aggregate } from "@woltz/rich-domain";
import { Readable } from "stream";
import type {
  CsvExportOptions,
  CsvExportStats,
  ExportProgressCallback,
  PropsOf,
} from "./types.js";
import { validateCsvExportOptions } from "./utils/csv-validator.js";
import {
  CsvValidationError,
  CsvFormatterError,
  CsvExportOperationError,
} from "./errors.js";
import { buildDataRow, buildHeaderRow } from "./utils/csv-builder.js";

/**
 * Service for exporting repository data to CSV format
 *
 * This service works with any rich-domain repository and provides
 * CSV export capabilities without extending the repository class.
 *
 * @example
 * ```typescript
 * const csvService = new CsvExportService();
 *
 * const csv = await csvService.export(
 *   userRepository,
 *   criteria,
 *   {
 *     columns: ["name", "email"],
 *     headers: { name: "Full Name" }
 *   }
 * );
 * ```
 */
export class CsvExportService {
  /**
   * Export entities from a repository to CSV format
   *
   * @param repository - Repository to export from
   * @param criteria - Filter and sort criteria
   * @param options - Export configuration
   * @param onProgress - Optional progress callback
   * @returns CSV string and export statistics
   * @throws {CsvValidationError} If export options are invalid
   * @throws {CsvFormatterError} If a custom formatter fails
   * @throws {CsvExportOperationError} If export operation fails
   *
   * @example
   * ```typescript
   * const { csv, stats } = await csvService.export(
   *   userRepository,
   *   Criteria.create<User>().where("status", "equals", "active"),
   *   { columns: ["name", "email"] }
   * );
   *
   * console.log(`Exported ${stats.totalRecords} users in ${stats.durationMs}ms`);
   * ```
   */
  async export<T extends Aggregate<any>>(
    repository: Repository<T>,
    criteria?: Criteria<T>,
    options: CsvExportOptions<T> = {},
    onProgress?: ExportProgressCallback
  ): Promise<{ csv: string; stats: CsvExportStats }> {
    const startTime = Date.now();
    const delimiter = options.delimiter ?? ",";
    const includeHeaders = options.includeHeaders ?? true;

    try {
      const exportCriteria = this.prepareCriteria(criteria);
      const result = await repository.find(exportCriteria);
      const entities = result.data;

      if (entities.length === 0) {
        const csv = includeHeaders
          ? buildHeaderRow([], options, delimiter)
          : "";

        return {
          csv,
          stats: {
            totalRecords: 0,
            totalColumns: 0,
            sizeInBytes: Buffer.byteLength(csv, "utf8"),
            durationMs: Date.now() - startTime,
            hasWarnings: false,
            warnings: [],
          },
        };
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

      const stats: CsvExportStats = {
        totalRecords: records.length,
        totalColumns: columns.length,
        sizeInBytes: Buffer.byteLength(csv, "utf8"),
        durationMs: Date.now() - startTime,
        hasWarnings: Boolean(validation.warnings?.length),
        warnings: validation.warnings ?? [],
      };

      return { csv, stats };
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
   * @param repository - Repository to export from
   * @param criteria - Filter and sort criteria
   * @param options - Export configuration
   * @returns Readable stream of CSV data
   * @throws {CsvValidationError} If export options are invalid
   * @throws {CsvExportOperationError} If export operation fails
   *
   * @example
   * ```typescript
   * const stream = await csvService.exportStream(
   *   userRepository,
   *   criteria,
   *   { batchSize: 500 }
   * );
   *
   * stream.pipe(fs.createWriteStream("users.csv"));
   * ```
   */
  async exportStream<T extends Aggregate<any>>(
    repository: Repository<T>,
    criteria?: Criteria<T>,
    options: CsvExportOptions<T> = {}
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
    let columns: PropsOf<T>[] = [];
    let validationDone = false;

    const service = this;

    const stream = new Readable({
      async read() {
        try {
          const batchCriteria =
            criteria?.clone().paginate(currentPage, batchSize) ??
            Criteria.create<T>().paginate(currentPage, batchSize);

          const result = await repository.find(batchCriteria);

          if (!headerEmitted) {
            if (result.data.length === 0) {
              if (includeHeaders) {
                this.push(buildHeaderRow([], options, delimiter) + "\n");
              }
              this.push(null);
              return;
            }

            const records = service.entitiesToRecords(result.data);
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

            columns = service.resolveColumns(options, sampleRecord);

            if (includeHeaders) {
              this.push(buildHeaderRow(columns, options, delimiter) + "\n");
            }

            headerEmitted = true;
          }

          const records = service.entitiesToRecords(result.data);

          for (const record of records) {
            try {
              const row = buildDataRow(record, columns, options, delimiter);
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
  private prepareCriteria<T extends Aggregate<any>>(
    criteria?: Criteria<T>
  ): Criteria<T> {
    if (!criteria) {
      return Criteria.create<T>().paginate(1, Number.MAX_SAFE_INTEGER);
    }

    return criteria.clone().paginate(1, Number.MAX_SAFE_INTEGER);
  }

  /**
   * Convert entities to plain objects
   */
  private entitiesToRecords<T>(entities: T[]): any[] {
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
  private resolveColumns<T extends Aggregate<any>>(
    options: CsvExportOptions<T>,
    sampleRecord: any
  ): PropsOf<T>[] {
    if (options.columns && options.columns.length > 0) {
      return options.columns;
    }

    return Object.keys(sampleRecord) as PropsOf<T>[];
  }
}
