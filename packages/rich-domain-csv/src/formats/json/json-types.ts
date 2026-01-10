import type { BaseExportStats } from "../../core/types.js";

/**
 * JSON-specific export statistics
 *
 * Extends base export statistics with JSON-specific fields
 * like total fields count and whether JSON Lines format was used.
 */
export interface JsonExportStats extends BaseExportStats {
  /**
   * Number of fields included per record
   */
  totalFields: number;

  /**
   * Whether JSON Lines format was used
   */
  jsonLines: boolean;

  /**
   * Format is always "json"
   */
  format: "json";
}
