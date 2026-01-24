export class PrismaRepositoryError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = "PrismaRepositoryError";
  }
}

export class ModelNotFoundError extends PrismaRepositoryError {
  constructor(modelName: string, availableModels?: string[], cause?: Error) {
    const availableList = availableModels?.length
      ? `\n\nAvailable models: ${availableModels.join(", ")}`
      : "";

    super(
      `Prisma model "${modelName}" not found in schema. ` +
        `Check if the model name matches your Prisma schema exactly (case-sensitive).${availableList}`,
      { cause }
    );
    this.name = "ModelNotFoundError";
  }
}

export class TableNotFoundError extends PrismaRepositoryError {
  constructor(entityName: string, registeredTables?: string[], cause?: Error) {
    const registeredList = registeredTables?.length
      ? `Registered tables: ${registeredTables.join(", ")}`
      : "";

    super(
      `Table not found for entity "${entityName}". ` +
        `Make sure you registered this entity in EntitySchemaRegistry or the table name is correct. ${registeredList}`,
      { cause }
    );
    this.name = "TableNotFoundError";
  }
}

export class NoRecordsAffectedError extends PrismaRepositoryError {
  constructor(
    operation: string,
    modelName: string,
    identifier: string | string[],
    cause?: Error
  ) {
    const id = Array.isArray(identifier) ? identifier.join(", ") : identifier;
    super(
      `${operation} operation on "${modelName}" affected 0 records. ` +
        `ID(s): ${id}. The record may not exist or was already deleted.`,
      { cause }
    );
    this.name = "NoRecordsAffectedError";
  }
}

export class BatchOperationError extends PrismaRepositoryError {
  constructor(
    operation: string,
    entityName: string,
    reason: string,
    cause?: Error
  ) {
    const causeInfo =
      cause && (cause as any).code
        ? ` (Prisma error: ${(cause as any).code})`
        : "";

    super(
      `Batch ${operation} failed for entity "${entityName}": ${reason}${causeInfo}`,
      { cause }
    );
    this.name = "BatchOperationError";
  }
}
