/**
 * Base error for CSV export operations
 */
export class CsvExportError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "CsvExportError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error thrown when CSV export validation fails
 */
export class CsvValidationError extends CsvExportError {
  constructor(
    message: string,
    public readonly validationErrors: string[]
  ) {
    super(message);
    this.name = "CsvValidationError";
  }
}

/**
 * Error thrown when CSV formatter fails
 */
export class CsvFormatterError extends CsvExportError {
  constructor(
    message: string,
    public readonly field: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = "CsvFormatterError";
  }
}

/**
 * Error thrown when CSV export operation fails
 */
export class CsvExportOperationError extends CsvExportError {
  constructor(
    message: string,
    public readonly phase: "fetch" | "convert" | "stream",
    cause?: Error
  ) {
    super(message, cause);
    this.name = "CsvExportOperationError";
  }
}