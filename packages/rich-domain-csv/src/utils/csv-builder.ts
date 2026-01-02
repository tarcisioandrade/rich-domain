import { CsvFormatterError } from "../errors";
import { CsvExportOptions, PropsOf } from "../types";
import { extractFieldValue, formatCsvValue } from "./csv-formatter";
import { isValidFormatter } from "./csv-validator";
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
          throw new CsvFormatterError(
            `Invalid formatter for field "${String(col)}"`,
            String(col)
          );
        }

        try {
          value = formatter(value);
        } catch (error) {
          throw new CsvFormatterError(
            `Formatter failed for field "${String(col)}"`,
            String(col),
            error as Error
          );
        }
      }

      return formatCsvValue(value, delimiter);
    } catch (error) {
      if (error instanceof CsvFormatterError) {
        throw error;
      }

      throw new CsvFormatterError(
        `Failed to format field "${String(col)}"`,
        String(col),
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
