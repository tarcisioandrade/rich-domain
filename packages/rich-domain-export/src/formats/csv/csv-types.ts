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

/**
 * Legacy type alias for CSV validation result
 * @deprecated Use ValidationResult from core/types.ts instead
 */
export type CsvValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
};
