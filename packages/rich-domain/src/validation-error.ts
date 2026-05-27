export interface ValidationIssue {
  path: string[];
  message: string;
}

export type FormattedValidationError = {
  path: string;
  message: string;
};

export class ValidationIssueCollector {
  private issues: ValidationIssue[] = [];

  add(path: string | string[], message: string): void {
    this.issues.push(createValidationIssue(path, message));
  }

  getIssues(): readonly ValidationIssue[] {
    return this.issues;
  }

  hasIssues(): boolean {
    return this.issues.length > 0;
  }

  clear(): void {
    this.issues = [];
  }

  toValidationError(options?: {
    entityName?: string;
  }): ValidationError | undefined {
    if (!this.hasIssues()) {
      return undefined;
    }
    return new ValidationError([...this.issues], options);
  }
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

  static fromIssues(
    issues: ValidationIssue[],
    options?: { message?: string; entityName?: string }
  ): ValidationError {
    return new ValidationError(issues, options);
  }

  static merge(
    existing: ValidationError | undefined,
    extra: ValidationIssue[],
    options?: { entityName?: string }
  ): ValidationError | undefined {
    if (!existing && extra.length === 0) {
      return undefined;
    }

    const allIssues = [...(existing?.issues ?? []), ...extra];
    return new ValidationError(allIssues, {
      entityName: options?.entityName ?? existing?.entityName,
    });
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

  private static normalizePath(path: string | string[]): string {
    return Array.isArray(path) ? path.join(".") : path;
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
  getErrorsForPath(path: string | string[]): ValidationIssue[] {
    const normalized = ValidationError.normalizePath(path);
    return this.issues.filter((i) => i.path.join(".") === normalized);
  }

  /**
   * Check if a specific path has errors
   */
  hasErrorsForPath(path: string | string[]): boolean {
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
   * Get validation errors formatted for UI/API consumption
   */
  getFormattedErrors(): FormattedValidationError[] {
    return this.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join(".") : "",
      message: issue.message,
    }));
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
