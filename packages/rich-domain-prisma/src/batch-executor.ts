import {
  AggregateChanges,
  EntitySchemaRegistry,
  CollectionConfig,
  BatchDeleteOperation,
  BatchCreateOperation,
  BatchUpdateOperation,
  BatchCreateItem,
} from "@woltz/rich-domain";
import {
  PrismaClientLike,
  PrismaTransactionClient,
  UOWStorage,
} from "./unit-of-work";
import { TableNotFoundError, BatchOperationError } from "./errors";

/**
 * Configuration for the BatchExecutor.
 */
export interface BatchExecutorConfig {
  /**
   * Schema registry for table/field mapping.
   */
  registry: EntitySchemaRegistry;
}

/**
 * Executes batch operations from AggregateChanges on Prisma.
 *
 * Handles:
 * - Deletes (leaf → root by depth DESC)
 *   - For 'owned' collections: deleteMany
 *   - For 'reference' collections: disconnect
 * - Creates (root → leaf by depth ASC)
 *   - For 'owned' collections: createMany
 *   - For 'reference' collections: connect
 * - Updates (any order)
 *
 * @example
 * ```typescript
 * const executor = new PrismaBatchExecutor(prisma, {
 *   registry: schemaRegistry,
 * });
 *
 * await executor.execute(changes);
 * ```
 */
export class PrismaBatchExecutor {
  constructor(
    private readonly context: PrismaClientLike | PrismaTransactionClient,
    private readonly config: BatchExecutorConfig
  ) {}

  /**
   * Execute all batch operations.
   */
  async execute(changes: AggregateChanges): Promise<void> {
    if (changes.isEmpty()) return;

    const ctx = UOWStorage.getStore()?.ctx;

    if (!ctx) {
      console.warn(
        "[PrismaBatchExecutor] Running outside a transaction. " +
          "Partial failures may leave data in an inconsistent state."
      );
    }

    const batch = changes.toBatchOperations();

    // Execute in correct order: deletes → creates → updates
    await this.executeDeletes(batch.deletes);
    await this.executeCreates(batch.creates);
    await this.executeUpdates(batch.updates);
  }

  /**
   * Execute delete operations.
   * - For 'reference' collections (N:N): uses disconnect
   * - For 'owned' collections (1:N): uses deleteMany
   */
  private async executeDeletes(
    deletes: Array<BatchDeleteOperation>
  ): Promise<void> {
    for (const del of deletes) {
      const { entity, ids, relationField, parentEntity, parentId } = del;

      if (relationField && parentEntity) {
        this.config.registry.validateRelationField(parentEntity, relationField);

        if (this.isReferenceCollection(parentEntity, relationField)) {
          await this.executeDisconnect(
            ids,
            relationField,
            parentEntity,
            parentId
          );
        } else {
          await this.executeDeleteMany(entity, ids);
        }
      } else {
        await this.executeDeleteMany(entity, ids);
      }
    }
  }

  /**
   * Execute create operations.
   * - For 'reference' collections (N:N): uses connect
   * - For 'owned' collections (1:N): uses createMany
   */
  private async executeCreates(
    creates: Array<BatchCreateOperation>
  ): Promise<void> {
    for (const create of creates) {
      const { entity, items, relationField, parentEntity } = create;

      if (relationField && parentEntity) {
        this.config.registry.validateRelationField(parentEntity, relationField);

        if (this.isReferenceCollection(parentEntity, relationField)) {
          await this.executeConnect(items, relationField, parentEntity);
        } else {
          await this.executeCreateMany(entity, items);
        }
      } else {
        await this.executeCreateMany(entity, items);
      }
    }
  }

  /**
   * Execute update operations.
   */
  private async executeUpdates(
    updates: Array<BatchUpdateOperation>
  ): Promise<void> {
    for (const upd of updates) {
      const table = this.config.registry.getTable(upd.entity);
      const model = (this.context as any)[table];

      if (!model) {
        throw new TableNotFoundError(upd.entity, this.getRegisteredTables());
      }

      for (const item of upd.items) {
        const mappedFields = this.config.registry.mapFields(
          upd.entity,
          item.changedFields
        );

        if (Object.keys(mappedFields).length > 0) {
          try {
            await model.update({
              where: { id: item.id },
              data: mappedFields,
            });
          } catch (error: any) {
            if (error.code === "P2025") {
              throw new BatchOperationError(
                "update",
                upd.entity,
                `Record with id "${item.id}" not found`,
                error
              );
            }
            throw error;
          }
        }
      }
    }
  }

  /**
   * Delete entities directly (for owned collections).
   */
  private async executeDeleteMany(
    entity: string,
    ids: string[]
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const table = this.config.registry.getTable(entity);
    const model = (this.context as any)[table];

    if (!model) {
      throw new TableNotFoundError(entity, this.getRegisteredTables());
    }

    const result = await model.deleteMany({
      where: { id: { in: ids } },
    });

    // Warn if some records were not deleted (optional strict mode)
    if (result.count < ids.length) {
      console.warn(
        `[PrismaBatchExecutor] DeleteMany on "${entity}": ` +
          `Expected to delete ${ids.length} records, but only ${result.count} were deleted. ` +
          `Some IDs may not exist: ${ids.join(", ")}`
      );
    }
  }

  /**
   * Create entities directly (for owned collections).
   */
  private async executeCreateMany(
    entity: string,
    items: Array<BatchCreateItem>
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const table = this.config.registry.getTable(entity);
    const model = (this.context as any)[table];

    if (!model) {
      throw new TableNotFoundError(entity, this.getRegisteredTables());
    }

    const records = items.map((item) => {
      const entityData = this.config.registry.mapEntity(entity, item.data);
      const fk = item.parentId
        ? this.config.registry.getParentFk(entity, item.parentId)
        : null;

      return { ...entityData, ...fk };
    });

    if (records.length > 0) {
      try {
        await model.createMany({
          data: records,
          skipDuplicates: true,
        });
      } catch (error: any) {
        throw new BatchOperationError(
          "createMany",
          entity,
          error.message || "Unknown error during batch creation",
          error
        );
      }
    }
  }

  /**
   * Connect entities to their parents (for reference/N:N collections).
   * Uses Prisma's nested connect operation.
   *
   * Groups items by parentId to execute one update per parent.
   */
  private async executeConnect(
    items: Array<BatchCreateItem>,
    relationField: string,
    parentEntity: string
  ): Promise<void> {
    if (items.length === 0) return;

    // Group items by parentId (can have multiple parents)
    const groupedByParent = new Map<string, string[]>();

    for (const item of items) {
      const parentId = item.parentId;
      if (!parentId) continue;

      const entityId = this.getEntityId(item.data);
      if (!entityId) continue;

      if (!groupedByParent.has(parentId)) {
        groupedByParent.set(parentId, []);
      }
      groupedByParent.get(parentId)!.push(entityId);
    }

    if (groupedByParent.size === 0) return;

    const parentTable = this.config.registry.getTable(parentEntity);
    const parentModel = (this.context as any)[parentTable];

    if (!parentModel) {
      throw new TableNotFoundError(parentEntity, this.getRegisteredTables());
    }

    const juction = this.config.registry.getJunctionConfig(
      parentEntity,
      relationField
    );
    const relationName = this.config.registry.getRelationFieldName(
      parentEntity,
      relationField
    );

    // Execute connect for each parent
    for (const [parentId, idsToConnect] of groupedByParent) {
      try {
        if (juction) {
          await this.insertIntoJunctionTable(juction, parentId, idsToConnect);
        } else {
          await parentModel.update({
            where: { id: parentId },
            data: {
              [relationName]: {
                connect: idsToConnect.map((id) => ({ id })),
              },
            },
          });
        }
      } catch (error: any) {
        if (error.code === "P2025") {
          throw new BatchOperationError(
            "connect",
            parentEntity,
            `Parent record with id "${parentId}" not found`,
            error
          );
        }
        throw new BatchOperationError(
          "connect",
          parentEntity,
          `Failed to connect relation "${relationName}": ${error.message}`,
          error
        );
      }
    }
  }

  private async insertIntoJunctionTable(
    junction: NonNullable<CollectionConfig["junction"]>,
    parentId: string,
    idsToConnect: string[]
  ) {
    const junctionModel = (this.context as any)[junction.table];

    if (!junctionModel) {
      throw new TableNotFoundError(junction.table, this.getRegisteredTables());
    }
    await junctionModel.createMany({
      data: idsToConnect.map((id) => ({
        [junction.targetKey]: id,
        [junction.sourceKey]: parentId,
      })),
    });
  }

  /**
   * Disconnect entities from their parent (for reference/N:N collections).
   * Uses Prisma's nested disconnect operation.
   */
  private async executeDisconnect(
    ids: string[],
    relationField: string,
    parentEntity: string,
    parentId?: string
  ): Promise<void> {
    if (ids.length === 0 || !parentId) return;

    const parentTable = this.config.registry.getTable(parentEntity);
    const parentModel = (this.context as any)[parentTable];

    if (!parentModel) {
      throw new TableNotFoundError(parentEntity, this.getRegisteredTables());
    }

    const junction = this.config.registry.getJunctionConfig(
      parentEntity,
      relationField
    );
    const relationName = this.config.registry.getRelationFieldName(
      parentEntity,
      relationField
    );

    try {
      if (junction) {
        await this.deleteFromJunctionTable(junction, parentId, ids);
      } else {
        await parentModel.update({
          where: { id: parentId },
          data: {
            [relationName]: {
              disconnect: ids.map((id) => ({ id })),
            },
          },
        });
      }
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new BatchOperationError(
          "disconnect",
          parentEntity,
          `Parent record with id "${parentId}" not found`,
          error
        );
      }
      throw new BatchOperationError(
        "disconnect",
        parentEntity,
        `Failed to disconnect relation "${relationName}": ${error.message}`,
        error
      );
    }
  }

  private async deleteFromJunctionTable(
    junction: NonNullable<CollectionConfig["junction"]>,
    parentId: string,
    idsToDisconnect: string[]
  ) {
    const junctionModel = (this.context as any)[junction.table];

    if (!junctionModel) {
      throw new TableNotFoundError(junction.table, this.getRegisteredTables());
    }
    await junctionModel.deleteMany({
      where: {
        [junction.sourceKey]: parentId,
        [junction.targetKey]: { in: idsToDisconnect },
      },
    });
  }

  /**
   * Check if a relation field is a reference (N:N) collection.
   */
  private isReferenceCollection(
    parentEntity: string,
    relationField: string
  ): boolean {
    return this.config.registry.isReferenceCollection(
      parentEntity,
      relationField
    );
  }

  /**
   * Extract ID from an entity/data object.
   */
  private getEntityId(item: any): string | undefined {
    if (!item) return undefined;
    if (item.id?.value !== undefined && item.id?.value !== null) {
      return String(item.id.value);
    }
    if (typeof item.id === "string") return item.id;
    if (typeof item.id === "number") return String(item.id);
    return undefined;
  }

  private getRegisteredTables() {
    return this.config.registry.getAllSchemas().map((schema) => schema.table);
  }
}

/**
 * Execute batch operations from changes.
 * Convenience function for one-off usage.
 */
export async function executeBatch(
  context: PrismaClientLike | PrismaTransactionClient,
  changes: AggregateChanges,
  config: BatchExecutorConfig
): Promise<void> {
  const executor = new PrismaBatchExecutor(context, config);
  await executor.execute(changes);
}
