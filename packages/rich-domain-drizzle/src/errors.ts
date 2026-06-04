export class DrizzleAdapterError extends Error {
  constructor(message: string) {
    super(`[DrizzleAdapter] ${message}`);
    this.name = "DrizzleAdapterError";
  }
}

export class TableNotFoundError extends DrizzleAdapterError {
  constructor(
    public readonly entityName: string,
    public readonly availableTables: string[]
  ) {
    super(
      `Table for entity "${entityName}" not found in tableMap. ` +
        `Available: ${availableTables.join(", ")}`
    );
    this.name = "TableNotFoundError";
  }
}

export class NoRecordsAffectedError extends DrizzleAdapterError {
  constructor(
    public readonly operation: string,
    public readonly entity: string,
    public readonly id: string,
    public readonly cause?: Error
  ) {
    super(`${operation} on ${entity} (id: ${id}) affected 0 records`);
    this.name = "NoRecordsAffectedError";
  }
}

export class BatchOperationError extends DrizzleAdapterError {
  constructor(
    public readonly operation: string,
    public readonly entity: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`Batch ${operation} on ${entity} failed: ${message}`);
    this.name = "BatchOperationError";
  }
}

export class DrizzleRepositoryError extends DrizzleAdapterError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "DrizzleRepositoryError";
  }
}

export class OutboxStoreError extends DrizzleAdapterError {
  constructor(message: string) {
    super(`[OutboxStore] ${message}`);
    this.name = "OutboxStoreError";
  }
}

export class MissingJunctionConfigError extends DrizzleAdapterError {
  constructor(
    public readonly parentEntity: string,
    public readonly collectionField: string
  ) {
    super(
      `Collection "${collectionField}" on entity "${parentEntity}" is of type "reference" but has no junction configured. ` +
        `Drizzle does not manage junction tables automatically — you must provide the junction config. ` +
        `Example:\n` +
        `  collections: {\n` +
        `    ${collectionField}: {\n` +
        `      type: "reference",\n` +
        `      entity: "TargetEntity",\n` +
        `      junction: {\n` +
        `        table: "${parentEntity.toLowerCase()}_${collectionField}",\n` +
        `        sourceKey: "${parentEntity.toLowerCase()}Id",\n` +
        `        targetKey: "targetEntityId",\n` +
        `      },\n` +
        `    },\n` +
        `  }`
    );
    this.name = "MissingJunctionConfigError";
  }
}
