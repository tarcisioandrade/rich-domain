// Core types and interfaces
export type {
  PropsOf,
  BaseExportOptions,
  BaseExportStats,
  ExportResult,
  ExportProgressCallback,
  ValidationResult,
} from "./core/types.js";

export type { ExportFormatStrategy } from "./core/format-strategy.js";

export type {
  CsvExportOptions,
  JsonExportOptions,
  ExportOptions,
  OptionsForFormat,
} from "./core/format-options.js";

// Core errors
export {
  ExportError,
  ValidationError,
  FormatterError,
  ExportOperationError,
} from "./core/errors.js";

// Format strategies
export { CsvFormatStrategy } from "./formats/csv/csv-strategy.js";
export { JsonFormatStrategy } from "./formats/json/json-strategy.js";

// Format-specific types
export type { CsvExportStats } from "./formats/csv/csv-types.js";
export type { JsonExportStats } from "./formats/json/json-types.js";

// CSV utilities
export {
  escapeCsvValue,
  formatCsvValue,
  extractFieldValue,
  commonFormatters,
} from "./formats/csv/csv-formatter.js";

export {
  validateCsvExportOptions,
  isValidFormatter,
  isValidDelimiter,
} from "./formats/csv/csv-validator.js";

// JSON utilities
export {
  validateJsonExportOptions,
  isValidTransformer,
} from "./formats/json/json-validator.js";

// Services (composition pattern)
export { ExportService } from "./services/export-service.js";
export { FormatRegistry } from "./services/format-registry.js";

// Repository (inheritance pattern)
export { ExportableRepository } from "./repository/exportable-repository.js";

// Utilities
export {
  entitiesToRecords,
  createRecordIterator,
} from "./utils/entity-converter.js";
