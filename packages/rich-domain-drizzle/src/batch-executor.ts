import {
  eq,
  inArray,
  and,
} from "drizzle-orm";
import {
  AggregateChanges,
  EntitySchemaRegistry,
  BatchDeleteOperation,
  BatchCreateOperation,
  BatchUpdateOperation,
  BatchCreateItem,
} from "@woltz/rich-domain";
import { DrizzleClient } from "./unit-of-work";
import { TableNotFoundError, BatchOperationError } from "./errors";

export interface DrizzleBatchExecutorConfig {
  registry: EntitySchemaRegistry;
  db: DrizzleClient;
  tableMap: Map<string, any>;
}

export class DrizzleBatchExecutor {
  constructor(private readonly config: DrizzleBatchExecutorConfig) {}

  /**
   * Execute all batch operations in order:
   * 1. Deletes (leaf → root, sorted by depth DESC)
   * 2. Creates (root → leaf, sorted by depth ASC)
   * 3. Updates (any order)
   */
  async execute(changes: AggregateChanges): Promise<void> {
    if (changes.isEmpty()) return;

    const batch = changes.toBatchOperations();

    await this.executeDeletes(batch.deletes);
    await this.executeCreates(batch.creates);
    await this.executeUpdates(batch.updates);
  }

  private async executeDeletes(
    deletes: Array<BatchDeleteOperation>
  ): Promise<void> {
    const sorted = [...deletes].sort((a, b) => b.depth - a.depth);

    for (const del of sorted) {
      const { entity, ids, relationField, parentEntity, parentId } = del;

      if (relationField && parentEntity) {
        this.config.registry.validateRelationField(parentEntity, relationField);

        if (
          this.config.registry.isReferenceCollection(
            parentEntity,
            relationField
          )
        ) {
          await this.executeJunctionDelete(
            parentEntity,
            relationField,
            parentId,
            ids
          );
        } else {
          await this.executeDeleteOwned(entity, ids);
        }
      } else {
        await this.executeDeleteOwned(entity, ids);
      }
    }
  }

  private async executeDeleteOwned(
    entity: string,
    ids: string[]
  ): Promise<void> {
    if (ids.length === 0) return;

    const table = this.getTable(entity);

    try {
      await this.config.db.delete(table).where(inArray(table.id, ids));
    } catch (error: any) {
      throw new BatchOperationError(
        "delete",
        entity,
        error.message || "Unknown error during deletion",
        error
      );
    }
  }

  private async executeJunctionDelete(
    parentEntity: string,
    relationField: string,
    parentId: string | undefined,
    ids: string[]
  ): Promise<void> {
    if (ids.length === 0 || !parentId) return;

    const junction = this.config.registry.getJunctionConfig(
      parentEntity,
      relationField
    );

    if (!junction) return;

    const junctionTable = this.getJunctionTable(junction.table);

    try {
      await this.config.db
        .delete(junctionTable)
        .where(
          and(
            eq(junctionTable[junction.sourceKey], parentId),
            inArray(junctionTable[junction.targetKey], ids)
          )
        );
    } catch (error: any) {
      throw new BatchOperationError(
        "disconnect",
        junction.table,
        error.message || "Failed to delete from junction table",
        error
      );
    }
  }

  private async executeCreates(
    creates: Array<BatchCreateOperation>
  ): Promise<void> {
    const sorted = [...creates].sort((a, b) => a.depth - b.depth);

    for (const create of sorted) {
      const { entity, items, relationField, parentEntity } = create;

      if (relationField && parentEntity) {
        this.config.registry.validateRelationField(parentEntity, relationField);

        if (
          this.config.registry.isReferenceCollection(
            parentEntity,
            relationField
          )
        ) {
          await this.executeJunctionCreate(
            parentEntity,
            relationField,
            items
          );
        } else {
          await this.executeCreateOwned(entity, items);
        }
      } else {
        await this.executeCreateOwned(entity, items);
      }
    }
  }

  private async executeCreateOwned(
    entity: string,
    items: Array<BatchCreateItem>
  ): Promise<void> {
    if (items.length === 0) return;

    const table = this.getTable(entity);

    const records = items.map((item) => {
      const entityData = this.config.registry.mapEntity(entity, item.data);
      const fk = item.parentId
        ? this.config.registry.getParentFk(entity, item.parentId)
        : null;

      return { ...entityData, ...fk };
    });

    try {
      await this.config.db.insert(table).values(records);
    } catch (error: any) {
      throw new BatchOperationError(
        "create",
        entity,
        error.message || "Unknown error during creation",
        error
      );
    }
  }

  private async executeJunctionCreate(
    parentEntity: string,
    relationField: string,
    items: Array<BatchCreateItem>
  ): Promise<void> {
    if (items.length === 0) return;

    const junction = this.config.registry.getJunctionConfig(
      parentEntity,
      relationField
    );

    if (!junction) return;

    const junctionTable = this.getJunctionTable(junction.table);

    const grouped = new Map<string, string[]>();
    for (const item of items) {
      const parentId = item.parentId;
      if (!parentId) continue;
      const entityId = this.extractId(item.data);
      if (!entityId) continue;

      if (!grouped.has(parentId)) {
        grouped.set(parentId, []);
      }
      grouped.get(parentId)!.push(entityId);
    }

    const records: Record<string, string>[] = [];
    for (const [parentId, targetIds] of grouped) {
      for (const targetId of targetIds) {
        records.push({
          [junction.sourceKey]: parentId,
          [junction.targetKey]: targetId,
        });
      }
    }

    if (records.length === 0) return;

    try {
      await this.config.db
        .insert(junctionTable)
        .values(records)
        .onConflictDoNothing();
    } catch (error: any) {
      throw new BatchOperationError(
        "connect",
        junction.table,
        error.message || "Failed to insert into junction table",
        error
      );
    }
  }

  private async executeUpdates(
    updates: Array<BatchUpdateOperation>
  ): Promise<void> {
    for (const upd of updates) {
      const table = this.getTable(upd.entity);

      for (const item of upd.items) {
        const mappedFields = this.config.registry.mapFields(
          upd.entity,
          item.changedFields
        );

        if (Object.keys(mappedFields).length > 0) {
          try {
            await this.config.db
              .update(table)
              .set(mappedFields)
              .where(eq(table.id, item.id));
          } catch (error: any) {
            throw new BatchOperationError(
              "update",
              upd.entity,
              error.message || "Failed to update entity",
              error
            );
          }
        }
      }
    }
  }

  private getTable(entityName: string): any {
    const table = this.config.tableMap.get(entityName);
    if (!table) {
      throw new TableNotFoundError(
        entityName,
        Array.from(this.config.tableMap.keys())
      );
    }
    return table;
  }

  private getJunctionTable(tableName: string): any {
    const table = this.config.tableMap.get(tableName);
    if (!table) {
      throw new TableNotFoundError(
        tableName,
        Array.from(this.config.tableMap.keys())
      );
    }
    return table;
  }

  private extractId(data: any): string | undefined {
    if (!data) return undefined;
    if (data.id?.value !== undefined && data.id?.value !== null) {
      return String(data.id.value);
    }
    if (typeof data.id === "string") return data.id;
    if (typeof data.id === "number") return String(data.id);
    return undefined;
  }
}

export async function executeBatch(
  db: DrizzleClient,
  changes: AggregateChanges,
  config: Omit<DrizzleBatchExecutorConfig, "db">
): Promise<void> {
  const executor = new DrizzleBatchExecutor({ ...config, db });
  await executor.execute(changes);
}
