import type { Aggregate } from "@woltz/rich-domain";
import { Readable } from "stream";
import type { ExportFormatStrategy } from "../../core/format-strategy.js";
import type {
  ExportResult,
  ExportProgressCallback,
  ValidationResult,
} from "../../core/types.js";
import type { JsonExportOptions } from "../../core/format-options.js";
import type { JsonExportStats } from "./json-types.js";
import { validateJsonExportOptions } from "./json-validator.js";

/**
 * JSON export format strategy
 *
 * Implements the ExportFormatStrategy interface for JSON format.
 * Supports both standard JSON arrays and JSON Lines (JSONL) for streaming.
 *
 * @template T - Aggregate type being exported
 */
export class JsonFormatStrategy<
  T extends Aggregate<any>,
> implements ExportFormatStrategy<JsonExportOptions<T>, JsonExportStats> {
  /**
   * Export entities to JSON format (in-memory)
   *
   * @param records - Array of plain objects from entity.toJSON()
   * @param options - JSON export options
   * @param onProgress - Optional progress callback
   * @returns Export result with JSON data and statistics
   */
  async export(
    records: any[],
    options: JsonExportOptions<T>,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult<JsonExportStats>> {
    const startTime = Date.now();
    const {
      pretty = false,
      indent = 2,
      jsonLines = false,
      fields,
      transformers,
      rootKey,
    } = options;

    // Process records
    const processedRecords = records.map((record, index) => {
      const processed = this.processRecord(record, fields, transformers);

      // Report progress
      if (onProgress) {
        onProgress(index + 1, records.length);
      }

      return processed;
    });

    let data: string;

    if (jsonLines) {
      // JSON Lines format: one JSON object per line
      data = processedRecords
        .map((record) => JSON.stringify(record))
        .join("\n");
    } else {
      // Standard JSON array format
      const output = rootKey
        ? { [rootKey]: processedRecords }
        : processedRecords;

      data = pretty
        ? JSON.stringify(output, null, indent)
        : JSON.stringify(output);
    }

    // Calculate total fields from first record (or 0 if no records)
    const totalFields =
      fields?.length ??
      (processedRecords.length > 0
        ? Object.keys(processedRecords[0]).length
        : 0);

    return {
      data,
      stats: {
        totalRecords: records.length,
        totalFields,
        sizeInBytes: Buffer.byteLength(data, "utf8"),
        durationMs: Date.now() - startTime,
        hasWarnings: false,
        warnings: [],
        format: "json",
        jsonLines,
      },
    };
  }

  /**
   * Export entities to JSON stream (for large datasets)
   *
   * @param recordsIterator - Async iterable of record batches
   * @param options - JSON export options
   * @returns Readable stream of JSON data
   */
  async exportStream(
    recordsIterator: AsyncIterable<any[]>,
    options: JsonExportOptions<T>
  ): Promise<Readable> {
    const {
      jsonLines = false,
      pretty = false,
      indent = 2,
      fields,
      transformers,
      rootKey,
    } = options;

    let isFirstBatch = true;
    let isFirstItem = true;
    const iterator = recordsIterator[Symbol.asyncIterator]();
    const processRecord = this.processRecord.bind(this);
    const indentJson = this.indentJson.bind(this);

    const stream = new Readable({
      async read() {
        try {
          const { value: batch, done } = await iterator.next();

          if (done) {
            // Handle empty stream - need to open and close array
            if (isFirstBatch && !jsonLines) {
              if (rootKey) {
                this.push(pretty ? `{"${rootKey}": []}` : `{"${rootKey}":[]}`);
              } else {
                this.push("[]");
              }
            } else if (!jsonLines) {
              // Close the JSON array if not using JSON Lines
              if (pretty) {
                this.push("\n");
              }
              this.push(rootKey ? "]}" : "]");
            }
            this.push(null); // End of stream
            return;
          }

          // Open the JSON structure on first batch (if not JSON Lines)
          if (isFirstBatch && !jsonLines) {
            if (rootKey) {
              this.push(pretty ? `{"${rootKey}": [\n` : `{"${rootKey}":[`);
            } else {
              this.push(pretty ? "[\n" : "[");
            }
            isFirstBatch = false;
          }

          // Process and emit records
          for (let i = 0; i < batch.length; i++) {
            const record = processRecord(batch[i], fields, transformers);

            if (jsonLines) {
              // JSON Lines: one object per line
              this.push(JSON.stringify(record) + "\n");
            } else {
              // JSON Array: comma-separated objects
              if (!isFirstItem) {
                this.push(",");
                if (pretty) {
                  this.push("\n");
                }
              }

              const json = pretty
                ? indentJson(JSON.stringify(record, null, indent), 1, indent)
                : JSON.stringify(record);

              this.push(json);

              if (isFirstItem) {
                isFirstItem = false;
              }
            }
          }
        } catch (error) {
          this.destroy(error as Error);
        }
      },
    });

    return stream;
  }

  /**
   * Validate JSON export options
   *
   * @param options - JSON export options
   * @param sampleRecord - Optional sample record for field validation
   * @returns Validation result
   */
  validateOptions(
    options: JsonExportOptions<T>,
    sampleRecord?: any
  ): ValidationResult {
    return validateJsonExportOptions(options, sampleRecord);
  }

  /**
   * Get MIME type for JSON format
   *
   * @returns "application/json" or "application/x-ndjson" for JSON Lines
   */
  getMimeType(): string {
    // Note: We can't access options here, so we return the standard JSON MIME type
    // The caller should check the options.jsonLines flag if they need the specific MIME type
    return "application/json";
  }

  /**
   * Get file extension for JSON format
   *
   * @returns "json" or "jsonl" for JSON Lines
   */
  getFileExtension(): string {
    // Note: We can't access options here, so we return the standard JSON extension
    // The caller should check the options.jsonLines flag if they need the specific extension
    return "json";
  }

  /**
   * Get format name
   *
   * @returns "json"
   */
  getFormatName(): string {
    return "json";
  }

  /**
   * Process a single record
   *
   * Applies field selection and transformers to the record.
   *
   * @param record - Record to process
   * @param fields - Optional fields to include
   * @param transformers - Optional field transformers
   * @returns Processed record
   */
  private processRecord(record: any, fields?: any[], transformers?: any): any {
    // Apply field filtering
    let processed = fields
      ? Object.fromEntries(fields.map((field) => [field, record[field]]))
      : { ...record };

    // Apply transformers
    if (transformers) {
      for (const [field, transformer] of Object.entries(transformers)) {
        if (field in processed && typeof transformer === "function") {
          processed[field] = (transformer as Function)(processed[field]);
        }
      }
    }

    return processed;
  }

  /**
   * Indent JSON string for pretty printing in arrays
   *
   * Adds additional indentation to nested JSON for proper array formatting.
   *
   * @param json - JSON string to indent
   * @param level - Indentation level
   * @param indent - Number of spaces per level
   * @returns Indented JSON string
   */
  private indentJson(json: string, level: number, indent: number): string {
    const spaces = " ".repeat(level * indent);
    return json
      .split("\n")
      .map((line, index) => (index === 0 ? line : spaces + line))
      .join("\n");
  }
}
