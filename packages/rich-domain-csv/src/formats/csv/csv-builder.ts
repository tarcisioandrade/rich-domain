import { FormatterError } from "../../core/errors.js";
import type { CsvExportOptions } from "../../core/format-options.js";
import type { PropsOf } from "../../core/types.js";
import { extractFieldValue, formatCsvValue } from "./csv-formatter.js";
import { isValidFormatter } from "./csv-validator.js";
import type { Aggregate } from "@woltz/rich-domain";

export function buildCsvRow(values: string[], delimiter: string = ","): string {
  return values.join(delimiter);
}

export function buildDataRow<T extends Aggregate<any>>(
  record: any,
  columns: PropsOf<T>[],
  options: CsvExportOptions<T>,
  delimiter: string
): string {
  const formatters =
    options.formatters ?? ({} as CsvExportOptions<T>["formatters"]);

  const values = columns.map((col) => {
    try {
      let value = extractFieldValue(record, String(col));

      const formatter = formatters?.[col as keyof typeof formatters];
      if (formatter) {
        if (!isValidFormatter(formatter)) {
          throw new FormatterError(
            `Invalid formatter for field "${String(col)}"`,
            String(col),
            "csv"
          );
        }

        try {
          value = formatter(value);
        } catch (error) {
          throw new FormatterError(
            `Formatter failed for field "${String(col)}"`,
            String(col),
            "csv",
            error as Error
          );
        }
      }

      return formatCsvValue(value, delimiter);
    } catch (error) {
      if (error instanceof FormatterError) {
        throw error;
      }

      throw new FormatterError(
        `Failed to format field "${String(col)}"`,
        String(col),
        "csv",
        error as Error
      );
    }
  });

  return buildCsvRow(values, delimiter);
}

export function buildHeaderRow<T extends Aggregate<any>>(
  columns: PropsOf<T>[],
  options: CsvExportOptions<T>,
  delimiter: string
): string {
  if (columns.length === 0) {
    return "";
  }

  const headers = options.headers ?? ({} as CsvExportOptions<T>["headers"]);

  const headerValues = columns.map((col) => {
    const header = headers?.[col] ?? String(col);
    return formatCsvValue(header, delimiter);
  });

  return buildCsvRow(headerValues, delimiter);
}
