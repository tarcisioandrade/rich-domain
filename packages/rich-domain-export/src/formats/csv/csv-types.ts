import type { BaseExportStats } from "../../core/types.js";

/**
 * CSV-specific export statistics
 *
 * Extends base export statistics with CSV-specific fields
 * like total columns count.
 */
export interface CsvExportStats extends BaseExportStats {
  /**
   * Number of columns in the CSV export
   */
  totalColumns: number;

  /**
   * Format is always "csv"
   */
  format: "csv";
}
