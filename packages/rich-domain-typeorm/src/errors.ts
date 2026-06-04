/**
 * Base error for TypeORM adapter errors.
 */
export class TypeORMAdapterError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "TypeORMAdapterError";
    Object.setPrototypeOf(this, TypeORMAdapterError.prototype);
  }
}

/**
 * Thrown when an entity class is not found in the registry.
 */
export class EntityClassNotFoundError extends TypeORMAdapterError {
  constructor(entityName: string, availableEntities: string[]) {
    super(
      `Entity class not registered for: ${entityName}. ` +
        `Available entities: ${availableEntities.join(", ") || "none"}`,
      "ENTITY_CLASS_NOT_FOUND"
    );
    this.name = "EntityClassNotFoundError";
    Object.setPrototypeOf(this, EntityClassNotFoundError.prototype);
  }
}

/**
 * Thrown when a table is not found in the database.
 */
export class TableNotFoundError extends TypeORMAdapterError {
  constructor(entityName: string, availableEntities: string[]) {
    super(
      `Table not found for entity: ${entityName}. ` +
        `Available entities: ${availableEntities.join(", ") || "none"}`,
      "TABLE_NOT_FOUND"
    );
    this.name = "TableNotFoundError";
    Object.setPrototypeOf(this, TableNotFoundError.prototype);
  }
}

/**
 * Thrown when a batch operation fails.
 */
export class BatchOperationError extends TypeORMAdapterError {
  constructor(
    operation: string,
    entityName: string,
    message: string,
    cause?: Error
  ) {
    super(
      `Batch ${operation} failed for ${entityName}: ${message}`,
      "BATCH_OPERATION_FAILED",
      cause
    );
    this.name = "BatchOperationError";
    Object.setPrototypeOf(this, BatchOperationError.prototype);
  }
}

/**
 * Thrown when no records are affected by an operation.
 */
export class NoRecordsAffectedError extends TypeORMAdapterError {
  constructor(entityName: string, operation: string) {
    super(
      `No records affected for ${entityName} during ${operation}`,
      "NO_RECORDS_AFFECTED"
    );
    this.name = "NoRecordsAffectedError";
    Object.setPrototypeOf(this, NoRecordsAffectedError.prototype);
  }
}

/**
 * Thrown when a repository operation fails.
 */
export class OutboxStoreError extends TypeORMAdapterError {
  constructor(message: string) {
    super(`[OutboxStore] ${message}`, "OUTBOX_STORE_ERROR");
    this.name = "OutboxStoreError";
    Object.setPrototypeOf(this, OutboxStoreError.prototype);
  }
}

export class TypeORMRepositoryError extends TypeORMAdapterError {
  constructor(message: string, cause?: Error) {
    super(message, "REPOSITORY_ERROR", cause);
    this.name = "TypeORMRepositoryError";
    Object.setPrototypeOf(this, TypeORMRepositoryError.prototype);
  }
}
