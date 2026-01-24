import type { ExportFormatStrategy } from "../core/format-strategy.js";
import { CsvFormatStrategy } from "../formats/csv/csv-strategy.js";
import { JsonFormatStrategy } from "../formats/json/json-strategy.js";

/**
 * Registry for export format strategies
 *
 * Enables dynamic format registration and lookup using the Strategy Pattern.
 * Built-in formats (CSV, JSON) are automatically registered.
 *
 * @example
 * ```typescript
 * // Use built-in formats
 * const strategy = FormatRegistry.getStrategy("csv");
 *
 * // Register custom format
 * FormatRegistry.register("excel", ExcelFormatStrategy);
 * const excelStrategy = FormatRegistry.getStrategy("excel");
 *
 * // List all formats
 * const formats = FormatRegistry.getRegisteredFormats(); // ["csv", "json", "excel"]
 * ```
 */
export class FormatRegistry {
  /**
   * Map of format names to strategy constructor classes
   * @private
   */
  private static strategies = new Map<
    string,
    new () => ExportFormatStrategy<any, any>
  >();

  /**
   * Static initializer: Register built-in formats
   */
  static {
    // Register built-in formats
    this.register("csv", CsvFormatStrategy);
    this.register("json", JsonFormatStrategy);
  }

  /**
   * Register a new format strategy
   *
   * Adds a format strategy to the registry, making it available
   * for use in exports. Format names are case-insensitive.
   *
   * @param format - Format name (e.g., "csv", "json", "excel")
   * @param strategyClass - Strategy class constructor
   *
   * @example
   * ```typescript
   * // Register custom Excel format
   * FormatRegistry.register("excel", ExcelFormatStrategy);
   *
   * // Register custom Parquet format
   * FormatRegistry.register("parquet", ParquetFormatStrategy);
   * ```
   */
  static register(
    format: string,
    strategyClass: new () => ExportFormatStrategy<any, any>
  ): void {
    this.strategies.set(format.toLowerCase(), strategyClass);
  }

  /**
   * Get a format strategy by name
   *
   * Retrieves and instantiates a strategy for the specified format.
   * Format names are case-insensitive.
   *
   * @param format - Format name (e.g., "csv", "json")
   * @returns Strategy instance for the format
   * @throws {Error} If format is not registered
   *
   * @example
   * ```typescript
   * const strategy = FormatRegistry.getStrategy("csv");
   * const result = await strategy.export(records, options);
   * ```
   */
  static getStrategy(format: string): ExportFormatStrategy<any, any> {
    const StrategyClass = this.strategies.get(format.toLowerCase());

    if (!StrategyClass) {
      const available = Array.from(this.strategies.keys()).join(", ");
      throw new Error(
        `Export format "${format}" is not registered. Available formats: ${available}`
      );
    }

    return new StrategyClass();
  }

  /**
   * Check if a format is registered
   *
   * Tests whether a format strategy has been registered.
   * Format names are case-insensitive.
   *
   * @param format - Format name to check
   * @returns True if format is registered
   *
   * @example
   * ```typescript
   * if (FormatRegistry.hasFormat("excel")) {
   *   // Use Excel format
   * } else {
   *   // Fallback to CSV
   * }
   * ```
   */
  static hasFormat(format: string): boolean {
    return this.strategies.has(format.toLowerCase());
  }

  /**
   * Get all registered format names
   *
   * Returns an array of all format names that have been registered.
   * Useful for displaying available formats to users.
   *
   * @returns Array of format names
   *
   * @example
   * ```typescript
   * const formats = FormatRegistry.getRegisteredFormats();
   * console.log(`Available formats: ${formats.join(", ")}`);
   * // Output: "Available formats: csv, json"
   * ```
   */
  static getRegisteredFormats(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Unregister a format strategy
   *
   * Removes a format strategy from the registry.
   * Useful for testing or when dynamically managing formats.
   *
   * @param format - Format name to unregister
   * @returns True if format was removed, false if it wasn't registered
   *
   * @example
   * ```typescript
   * FormatRegistry.unregister("excel");
   * ```
   */
  static unregister(format: string): boolean {
    return this.strategies.delete(format.toLowerCase());
  }
}
