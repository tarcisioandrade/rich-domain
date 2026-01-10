import type { Aggregate } from "@woltz/rich-domain";
import { Readable } from "stream";
import type { ExportFormatStrategy } from "../../core/format-strategy.js";
import type {
  ExportResult,
  ExportProgressCallback,
  ValidationResult,
  PropsOf,
} from "../../core/types.js";
import type { CsvExportOptions } from "../../core/format-options.js";
import type { CsvExportStats } from "./csv-types.js";
import { buildHeaderRow, buildDataRow } from "./csv-builder.js";
import { validateCsvExportOptions } from "./csv-validator.js";

/**
 * CSV export format strategy
 *
 * Implements the ExportFormatStrategy interface for CSV format.
 * Supports both in-memory and streaming exports with RFC 4180 compliance.
 *
 * @template T - Aggregate type being exported
 */
export class CsvFormatStrategy<T extends Aggregate<any>>
  implements
    ExportFormatStrategy<CsvExportOptions<T>, CsvExportStats>
{
  /**
   * Export entities to CSV format (in-memory)
   *
   * @param records - Array of plain objects from entity.toJSON()
   * @param options - CSV export options
   * @param onProgress - Optional progress callback
   * @returns Export result with CSV data and statistics
   */
  async export(
    records: any[],
    options: CsvExportOptions<T>,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult<CsvExportStats>> {
    const startTime = Date.now();
    const delimiter = options.delimiter ?? ",";
    const includeHeaders = options.includeHeaders ?? true;

    // Handle empty records
    if (records.length === 0) {
      const data = includeHeaders
        ? buildHeaderRow([], options, delimiter)
        : "";

      return {
        data,
        stats: {
          totalRecords: 0,
          totalColumns: 0,
          sizeInBytes: Buffer.byteLength(data, "utf8"),
          durationMs: Date.now() - startTime,
          hasWarnings: false,
          warnings: [],
          format: "csv",
        },
      };
    }

    // Resolve columns from options or first record
    const columns = this.resolveColumns(options, records[0]);
    const rows: string[] = [];

    // Add header row if requested
    if (includeHeaders) {
      rows.push(buildHeaderRow(columns, options, delimiter));
    }

    // Build data rows
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const row = buildDataRow(record, columns, options, delimiter);
      rows.push(row);

      // Report progress
      if (onProgress) {
        onProgress(i + 1, records.length);
      }
    }

    const data = rows.join("\n");

    return {
      data,
      stats: {
        totalRecords: records.length,
        totalColumns: columns.length,
        sizeInBytes: Buffer.byteLength(data, "utf8"),
        durationMs: Date.now() - startTime,
        hasWarnings: false,
        warnings: [],
        format: "csv",
      },
    };
  }

  /**
   * Export entities to CSV stream (for large datasets)
   *
   * @param recordsIterator - Async iterable of record batches
   * @param options - CSV export options
   * @returns Readable stream of CSV data
   */
  async exportStream(
    recordsIterator: AsyncIterable<any[]>,
    options: CsvExportOptions<T>
  ): Promise<Readable> {
    const delimiter = options.delimiter ?? ",";
    const includeHeaders = options.includeHeaders ?? true;

    let headerEmitted = false;
    let columns: PropsOf<T>[] = [];
    const iterator = recordsIterator[Symbol.asyncIterator]();
    const resolveColumns = this.resolveColumns.bind(this);

    const stream = new Readable({
      async read() {
        try {
          const { value: batch, done } = await iterator.next();

          if (done) {
            this.push(null); // End of stream
            return;
          }

          // Emit header on first batch
          if (!headerEmitted && batch.length > 0) {
            columns = resolveColumns(options, batch[0]);

            if (includeHeaders) {
              this.push(buildHeaderRow(columns, options, delimiter) + "\n");
            }

            headerEmitted = true;
          }

          // Emit data rows
          for (const record of batch) {
            const row = buildDataRow(record, columns, options, delimiter);
            this.push(row + "\n");
          }
        } catch (error) {
          this.destroy(error as Error);
        }
      },
    });

    return stream;
  }

  /**
   * Validate CSV export options
   *
   * @param options - CSV export options
   * @param sampleRecord - Optional sample record for field validation
   * @returns Validation result
   */
  validateOptions(
    options: CsvExportOptions<T>,
    sampleRecord?: any
  ): ValidationResult {
    return validateCsvExportOptions(options, sampleRecord);
  }

  /**
   * Get MIME type for CSV format
   *
   * @returns "text/csv"
   */
  getMimeType(): string {
    return "text/csv";
  }

  /**
   * Get file extension for CSV format
   *
   * @returns "csv"
   */
  getFileExtension(): string {
    return "csv";
  }

  /**
   * Get format name
   *
   * @returns "csv"
   */
  getFormatName(): string {
    return "csv";
  }

  /**
   * Resolve which columns to export
   *
   * Uses options.columns if provided, otherwise uses all keys from sample record.
   *
   * @param options - CSV export options
   * @param sampleRecord - Sample record to extract keys from
   * @returns Array of column names
   */
  private resolveColumns(
    options: CsvExportOptions<T>,
    sampleRecord: any
  ): PropsOf<T>[] {
    if (options.columns && options.columns.length > 0) {
      return options.columns;
    }

    return Object.keys(sampleRecord) as PropsOf<T>[];
  }
}
