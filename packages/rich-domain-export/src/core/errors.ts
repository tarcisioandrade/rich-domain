/**
 * Base error class for all export-related errors
 *
 * Extends the standard Error class with support for error cause chaining.
 * All export errors inherit from this base class.
 */
export class ExportError extends Error {
  /**
   * Create a new export error
   *
   * @param message - Error message
   * @param cause - Optional underlying error that caused this error
   */
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "ExportError";

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExportError);
    }
  }
}

/**
 * Error thrown when export options validation fails
 *
 * Contains detailed validation error messages for debugging.
 *
 * @example
 * ```typescript
 * throw new ValidationError(
 *   "Invalid CSV options",
 *   ["Delimiter must be a single character", "Column 'foo' does not exist"]
 * );
 * ```
 */
export class ValidationError extends ExportError {
  /**
   * Create a new validation error
   *
   * @param message - Error message
   * @param validationErrors - Array of specific validation error messages
   */
  constructor(
    message: string,
    public readonly validationErrors: string[]
  ) {
    super(message);
    this.name = "ValidationError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Error thrown when a formatter/transformer function fails
 *
 * Contains context about which field and format caused the error.
 *
 * @example
 * ```typescript
 * throw new FormatterError(
 *   "Date formatter failed",
 *   "createdAt",
 *   "csv",
 *   originalError
 * );
 * ```
 */
export class FormatterError extends ExportError {
  /**
   * Create a new formatter error
   *
   * @param message - Error message
   * @param field - Field name that failed to format
   * @param format - Export format being used
   * @param cause - Optional underlying error
   */
  constructor(
    message: string,
    public readonly field: string,
    public readonly format: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = "FormatterError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FormatterError);
    }
  }
}

/**
 * Error thrown when an export operation fails
 *
 * Contains context about which phase of the export operation failed.
 *
 * @example
 * ```typescript
 * throw new ExportOperationError(
 *   "Failed to fetch entities",
 *   "fetch",
 *   "csv",
 *   repositoryError
 * );
 * ```
 */
export class ExportOperationError extends ExportError {
  /**
   * Create a new export operation error
   *
   * @param message - Error message
   * @param phase - Phase of export that failed
   * @param format - Export format being used
   * @param cause - Optional underlying error
   */
  constructor(
    message: string,
    public readonly phase: "fetch" | "convert" | "stream" | "validate",
    public readonly format: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = "ExportOperationError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExportOperationError);
    }
  }
}
