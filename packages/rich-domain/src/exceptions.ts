/**
 * Base exception class for all Rich Domain exceptions
 */
abstract class DomainException extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly __isDomainException = true;

  constructor(message: string, code?: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code || this.constructor.name;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Check if an error is a DomainException
   */
  static isDomainException(error: unknown): error is DomainException {
    return (
      error instanceof DomainException ||
      (error instanceof Error &&
        "__isDomainException" in error &&
        (error as any).__isDomainException === true)
    );
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): {
    name: string;
    message: string;
    code: string;
    timestamp: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Thrown when a domain rule or business logic is violated
 */
export class DomainError extends DomainException {
  constructor(message: string, code?: string) {
    super(message, code || "DOMAIN_ERROR");
  }
}

/**
 * Thrown for general application errors that don't fit other domain exceptions.
 */
export class ApplicationError extends DomainException {
  constructor(message: string, code?: string) {
    super(message, code || "APPLICATION_ERROR");
  }
}

/**
 * Thrown when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends DomainException {
  public readonly resource?: string;
  public readonly action?: string;

  constructor(message?: string, resource?: string, action?: string) {
    const defaultMessage =
      message || "Authentication required to access this resource";

    super(defaultMessage, "UNAUTHORIZED");
    this.resource = resource;
    this.action = action;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resource: this.resource,
      action: this.action,
    };
  }
}

/**
 * Thrown when the user is authenticated but doesn't have permission to perform an action
 */
export class ForbiddenError extends DomainException {
  public readonly resource?: string;
  public readonly action?: string;
  public readonly userId?: string;

  constructor(
    message?: string,
    resource?: string,
    action?: string,
    userId?: string
  ) {
    const defaultMessage =
      message || "You don't have permission to perform this action";

    super(defaultMessage, "FORBIDDEN");
    this.resource = resource;
    this.action = action;
    this.userId = userId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resource: this.resource,
      action: this.action,
      userId: this.userId,
    };
  }
}

/**
 * Thrown when a request is malformed or contains invalid data
 */
export class BadRequestError extends DomainException {
  public readonly field?: string;
  public readonly reason?: string;

  constructor(message: string, field?: string, reason?: string) {
    super(message, "BAD_REQUEST");
    this.field = field;
    this.reason = reason;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
      reason: this.reason,
    };
  }
}

/**
 * Thrown when an operation exceeds the allowed time limit
 */
export class TimeoutError extends DomainException {
  public readonly operation: string;
  public readonly timeoutMs?: number;

  constructor(operation: string, timeoutMs?: number, message?: string) {
    const defaultMessage = `Operation '${operation}' timed out${
      timeoutMs ? ` after ${timeoutMs}ms` : ""
    }`;

    super(message || defaultMessage, "TIMEOUT_ERROR");
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      operation: this.operation,
      timeoutMs: this.timeoutMs,
    };
  }
}

/**
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends DomainException {
  public readonly limit: number;
  public readonly windowMs: number;
  public readonly retryAfter?: number;

  constructor(
    limit: number,
    windowMs: number,
    retryAfter?: number,
    message?: string
  ) {
    const defaultMessage = `Rate limit exceeded: ${limit} requests per ${windowMs}ms`;

    super(message || defaultMessage, "RATE_LIMIT_ERROR");
    this.limit = limit;
    this.windowMs = windowMs;
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      limit: this.limit,
      windowMs: this.windowMs,
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Thrown when an entity or aggregate is not found
 */
export class EntityNotFoundError extends DomainException {
  public readonly entityType: string;
  public readonly entityId?: string;

  constructor(entityType: string, entityId?: string, message?: string) {
    const defaultMessage = entityId
      ? `${entityType} with id '${entityId}' not found`
      : `${entityType} not found`;

    super(message || defaultMessage, "ENTITY_NOT_FOUND");
    this.entityType = entityType;
    this.entityId = entityId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      entityType: this.entityType,
      entityId: this.entityId,
    };
  }
}

/**
 * Thrown when trying to create an entity that already exists
 */
export class EntityAlreadyExistsError extends DomainException {
  public readonly entityType: string;
  public readonly entityId?: string;

  constructor(entityType: string, entityId?: string, message?: string) {
    const defaultMessage = entityId
      ? `${entityType} with id '${entityId}' already exists`
      : `${entityType} already exists`;

    super(message || defaultMessage, "ENTITY_ALREADY_EXISTS");
    this.entityType = entityType;
    this.entityId = entityId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      entityType: this.entityType,
      entityId: this.entityId,
    };
  }
}

/**
 * Base exception for repository operations
 */
export class RepositoryError extends DomainException {
  constructor(message: string, code?: string) {
    super(message, code || "REPOSITORY_ERROR");
  }
}

/**
 * Thrown when a persistence operation fails
 */
export class PersistenceError extends RepositoryError {
  public readonly operation: string;
  public readonly cause?: Error;

  constructor(operation: string, message?: string, cause?: Error) {
    const defaultMessage = `Persistence operation '${operation}' failed${
      message ? `: ${message}` : ""
    }`;

    super(defaultMessage, "PERSISTENCE_ERROR");
    this.operation = operation;
    this.cause = cause;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      operation: this.operation,
      cause: this.cause?.message,
    };
  }
}

/**
 * Thrown when a concurrency conflict occurs (optimistic locking)
 */
export class ConcurrencyError extends RepositoryError {
  public readonly entityType: string;
  public readonly entityId: string;

  constructor(entityType: string, entityId: string, message?: string) {
    const defaultMessage =
      message ||
      `Concurrency conflict detected for ${entityType} with id '${entityId}'`;

    super(defaultMessage, "CONCURRENCY_ERROR");
    this.entityType = entityType;
    this.entityId = entityId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      entityType: this.entityType,
      entityId: this.entityId,
    };
  }
}

/**
 * Thrown when a database constraint is violated
 */
export class ConstraintViolationError extends RepositoryError {
  public readonly constraint: string;

  constructor(constraint: string, message?: string) {
    const defaultMessage =
      message || `Database constraint '${constraint}' violated`;

    super(defaultMessage, "CONSTRAINT_VIOLATION");
    this.constraint = constraint;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      constraint: this.constraint,
    };
  }
}

/**
 * Thrown when a value object has invalid data
 */
export class InvalidValueObjectError extends DomainException {
  public readonly valueObjectType: string;
  public readonly invalidValue?: any;

  constructor(valueObjectType: string, message: string, invalidValue?: any) {
    super(message, "INVALID_VALUE_OBJECT");
    this.valueObjectType = valueObjectType;
    this.invalidValue = invalidValue;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      valueObjectType: this.valueObjectType,
      invalidValue: this.invalidValue,
    };
  }
}

/**
 * Thrown when a domain event operation fails
 */
export class DomainEventError extends DomainException {
  public readonly eventType?: string;

  constructor(message: string, eventType?: string) {
    super(message, "DOMAIN_EVENT_ERROR");
    this.eventType = eventType;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      eventType: this.eventType,
    };
  }
}

/**
 * Thrown when an event handler fails
 */
export class EventHandlerError extends DomainEventError {
  public readonly handlerName: string;
  public readonly cause?: Error;

  constructor(handlerName: string, eventType: string, cause?: Error) {
    const message = `Event handler '${handlerName}' failed for event '${eventType}'${
      cause ? `: ${cause.message}` : ""
    }`;

    super(message, eventType);
    this.handlerName = handlerName;
    this.cause = cause;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      handlerName: this.handlerName,
      cause: this.cause?.message,
    };
  }
}

/**
 * Thrown when a criteria or query is invalid
 */
export class InvalidCriteriaError extends DomainException {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, "INVALID_CRITERIA");
    this.field = field;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
    };
  }
}

/**
 * Thrown when a transaction operation fails
 */
export class TransactionError extends DomainException {
  public readonly operation: string;
  public readonly cause?: Error;

  constructor(operation: string, message?: string, cause?: Error) {
    const defaultMessage = `Transaction ${operation} failed${
      message ? `: ${message}` : ""
    }`;

    super(defaultMessage, "TRANSACTION_ERROR");
    this.operation = operation;
    this.cause = cause;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      operation: this.operation,
      cause: this.cause?.message,
    };
  }
}

/**
 * Thrown when an unexpected or unknown error occurs
 */
export class UnknownError extends DomainException {
  public readonly originalError?: Error;

  constructor(message?: string, originalError?: Error) {
    const defaultMessage =
      message || originalError?.message || "An unknown error occurred";

    super(defaultMessage, "UNKNOWN_ERROR");
    this.originalError = originalError;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Thrown when a feature is not implemented yet
 */
export class NotImplementedError extends DomainException {
  public readonly feature: string;

  constructor(feature: string, message?: string) {
    const defaultMessage = message || `Feature '${feature}' is not implemented`;

    super(defaultMessage, "NOT_IMPLEMENTED");
    this.feature = feature;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      feature: this.feature,
    };
  }
}

/**
 * Thrown when a required configuration is missing
 */
export class ConfigurationError extends DomainException {
  public readonly configKey?: string;

  constructor(message: string, configKey?: string) {
    super(message, "CONFIGURATION_ERROR");
    this.configKey = configKey;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      configKey: this.configKey,
    };
  }
}

/**
 * Thrown when mapping between domain and persistence fails
 */
export class MapperError extends DomainException {
  public readonly direction: "toDomain" | "toPersistence";
  public readonly entityType: string;
  public readonly cause?: Error;

  constructor(
    direction: "toDomain" | "toPersistence",
    entityType: string,
    message?: string,
    cause?: Error
  ) {
    const defaultMessage =
      message ||
      `Failed to map ${entityType} ${
        direction === "toDomain" ? "to domain" : "to persistence"
      }`;

    super(defaultMessage, "MAPPER_ERROR");
    this.direction = direction;
    this.entityType = entityType;
    this.cause = cause;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      direction: this.direction,
      entityType: this.entityType,
      cause: this.cause?.message,
    };
  }
}
