export interface ValidationIssue {
  path: string[];
  message: string;
}

export class ValidationError extends Error {
  public readonly issues: ValidationIssue[];
  public readonly __isValidationError = true; // Brand for identification

  constructor(issues: ValidationIssue[], message?: string) {
    const errorMessage =
      message || `Validation failed: ${issues.map(i => i.message).join(', ')}`;
    super(errorMessage);
    this.name = 'ValidationError';
    this.issues = issues;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Check if an error is a ValidationError (works across module boundaries)
   */
  static isValidationError(error: unknown): error is ValidationError {
    if (error instanceof ValidationError) {
      return true;
    }
    // Check by duck typing for cross-module compatibility
    return (
      error instanceof Error &&
      error.name === 'ValidationError' &&
      'issues' in error &&
      Array.isArray((error as any).issues)
    );
  }

  /**
   * Get all error messages as a simple array
   */
  getMessages(): string[] {
    return this.issues.map(i => i.message);
  }

  /**
   * Get errors for a specific field path
   */
  getErrorsForPath(path: string): ValidationIssue[] {
    return this.issues.filter(i => i.path.join('.') === path);
  }

  /**
   * Check if a specific path has errors
   */
  hasErrorsForPath(path: string): boolean {
    return this.getErrorsForPath(path).length > 0;
  }

  /**
   * Convert to a plain object for serialization
   */
  toJSON(): { name: string; message: string; issues: ValidationIssue[] } {
    return {
      name: this.name,
      message: this.message,
      issues: this.issues,
    };
  }
}

/**
 * Helper to create a single validation issue
 */
export function createValidationIssue(
  path: string | string[],
  message: string
): ValidationIssue {
  return {
    path: Array.isArray(path) ? path : path.split('.'),
    message,
  };
}

/**
 * Helper to throw a validation error with a single issue
 */
export function throwValidationError(
  path: string | string[],
  message: string
): never {
  throw new ValidationError([createValidationIssue(path, message)]);
}
