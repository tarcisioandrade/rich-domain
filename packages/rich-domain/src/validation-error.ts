export interface ValidationIssue {
  path: string[];
  message: string;
}

export class ValidationError extends Error {
  public readonly issues: ValidationIssue[];
  public readonly __isValidationError = true;
  public readonly entityName?: string;

  constructor(
    issues: ValidationIssue[],
    options?: { message?: string; entityName?: string }
  ) {
    const errorMessage =
      options?.message ||
      ValidationError.formatMessage(issues, options?.entityName);
    super(errorMessage);
    this.name = "ValidationError";
    this.issues = issues;
    this.entityName = options?.entityName;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  private static formatMessage(
    issues: ValidationIssue[],
    entityName?: string
  ): string {
    const entityPrefix = entityName ? `[${entityName}] ` : "";

    if (issues.length === 0) {
      return `${entityPrefix}Validation failed`;
    }

    if (issues.length === 1) {
      const issue = issues[0];
      const pathStr =
        issue.path.length > 0 ? ` at "${issue.path.join(".")}"` : "";
      return `${entityPrefix}Validation failed${pathStr}: ${issue.message}`;
    }

    const errorLines = issues
      .map((issue, index) => {
        const pathStr =
          issue.path.length > 0 ? ` at "${issue.path.join(".")}"` : "";
        return `  ${index + 1}. ${issue.message}${pathStr}`;
      })
      .join("\n");

    return `${entityPrefix}Validation failed with ${issues.length} error(s):\n${errorLines}`;
  }

  /**
   * Check if an error is a ValidationError (works across module boundaries)
   */
  static isValidationError(error: unknown): error is ValidationError {
    if (error instanceof ValidationError) {
      return true;
    }
    return (
      error instanceof Error &&
      error.name === "ValidationError" &&
      "issues" in error &&
      Array.isArray((error as any).issues)
    );
  }

  /**
   * Get all error messages as a simple array
   */
  getMessages(): string[] {
    return this.issues.map((i) => i.message);
  }

  /**
   * Get errors for a specific field path
   */
  getErrorsForPath(path: string): ValidationIssue[] {
    return this.issues.filter((i) => i.path.join(".") === path);
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
  toJSON(): {
    name: string;
    message: string;
    issues: ValidationIssue[];
    entityName?: string;
  } {
    return {
      name: this.name,
      message: this.message,
      issues: this.issues,
      entityName: this.entityName,
    };
  }

  /**
   * Get a formatted string with all validation errors
   */
  getFormattedErrors(): string {
    return this.issues
      .map((issue) => {
        const pathStr =
          issue.path.length > 0 ? ` [${issue.path.join(".")}]` : "";
        return `${pathStr} ${issue.message}`;
      })
      .join("\n");
  }

  /**
   * Get a summary of the error for logging
   */
  getSummary(): string {
    const entityPrefix = this.entityName ? `[${this.entityName}] ` : "";
    const paths = this.issues
      .filter((i) => i.path.length > 0)
      .map((i) => i.path.join("."));

    if (paths.length === 0) {
      return `${entityPrefix}Validation failed with ${this.issues.length} error(s)`;
    }

    const uniquePaths = Array.from(new Set(paths));
    return `${entityPrefix}Validation failed on: ${uniquePaths.join(", ")} (${this.issues.length} error(s))`;
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
    path: Array.isArray(path) ? path : path.split("."),
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
