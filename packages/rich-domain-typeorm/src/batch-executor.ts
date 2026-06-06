import { EntityManager, ObjectLiteral, In } from "typeorm";
import { AggregateChanges, EntitySchemaRegistry } from "@woltz/rich-domain";
import {
  EntityClassNotFoundError,
  BatchOperationError,
  TypeORMAdapterError,
} from "./errors";

/**
 * Configuration for the TypeORM Batch Executor.
 */
export interface TypeORMBatchExecutorConfig {
  /**
   * Schema registry for entity/table mapping.
   */
  registry: EntitySchemaRegistry;

  /**
   * TypeORM EntityManager (transaction or default).
   */
  entityManager: EntityManager;

  /**
   * Map of entity names to TypeORM entity classes.
   *
   * @example
   * ```typescript
   * entityClasses: new Map([
   *   ['Post', PostEntity],
   *   ['Comment', CommentEntity],
   *   ['Tag', TagEntity]
   * ])
   * ```
   */
  entityClasses: Map<string, new () => ObjectLiteral>;
}

/**
 * Executes batch operations from AggregateChanges on TypeORM.
 *
 * Handles:
 * - Deletes (leaf → root by depth DESC)
 *   - For 'owned' collections: delete entities
 *   - For 'reference' collections: unlink via array manipulation or junction table
 * - Creates (root → leaf by depth ASC)
 *   - For 'owned' collections: create entities
 *   - For 'reference' collections: link via array manipulation or junction table
 * - Updates (any order)
 *
 * Uses EntitySchemaRegistry to determine relationship types and junction configurations.
 *
 * @example
 * ```typescript
 * const executor = new TypeORMBatchExecutor({
 *   registry: schemaRegistry,
 *   entityManager: uow.getCurrentEntityManager(),
 *   entityClasses: new Map([
 *     ['Post', PostEntity],
 *     ['Comment', CommentEntity],
 *     ['Tag', TagEntity]
 *   ])
 * });
 *
 * await executor.execute(aggregateChanges);
 * ```
 */
export class TypeORMBatchExecutor {
  constructor(private readonly config: TypeORMBatchExecutorConfig) {}

  /**
   * Execute all batch operations.
   */
  async execute(changes: AggregateChanges): Promise<void> {
    if (changes.isEmpty()) return;
    const batch = changes.toBatchOperations();
    await this.executeDeletes(batch.deletes);
    await this.executeCreates(batch.creates);
    await this.executeUpdates(batch.updates);
  }

  /**
   * Execute delete operations.
   * - For 'owned' collections: delete entities
   * - For 'reference' collections: unlink (disconnect)
   */
  private async executeDeletes(
    deletes: Array<{
      entity: string;
      depth: number;
      ids: string[];
      relationField?: string;
      parentId?: string;
      parentEntity?: string;
    }>
  ): Promise<void> {
    const sorted = [...deletes].sort((a, b) => b.depth - a.depth);
    for (const del of sorted) {
      if (del.relationField && del.parentEntity && del.parentId) {
        const isReference = this.config.registry.isReferenceCollection(
          del.parentEntity,
          del.relationField
        );
        if (isReference) {
          await this.disconnectFromParent(
            del.parentEntity,
            del.parentId,
            del.relationField,
            del.ids
          );
        } else {
          await this.deleteEntities(del.entity, del.ids);
        }
      } else {
        await this.deleteEntities(del.entity, del.ids);
      }
    }
  }

  /**
   * Delete entities (for owned collections or aggregate roots).
   */
  private async deleteEntities(
    entityName: string,
    ids: string[]
  ): Promise<void> {
    if (ids.length === 0) return;
    const EntityClass = this.getEntityClass(entityName);
    const em = this.config.entityManager;
    const pkField = this.config.registry.getPrimaryKeyField(entityName);
    try {
      await em.delete(EntityClass, { [pkField]: In(ids) });
    } catch (error: any) {
      throw new BatchOperationError(
        "delete",
        entityName,
        error.message || "Unknown error during deletion",
        error
      );
    }
  }

  /**
   * Disconnect N:N relationships.
   * Uses junction table if configured, otherwise manipulates array.
   */
  private async disconnectFromParent(
    parentEntityName: string,
    parentId: string,
    relationField: string,
    idsToRemove: string[]
  ): Promise<void> {
    if (idsToRemove.length === 0) return;
    const junctionConfig = this.config.registry.getJunctionConfig(
      parentEntityName,
      relationField
    );
    if (junctionConfig) {
      await this.deleteFromJunctionTable(junctionConfig, parentId, idsToRemove);
    } else {
      await this.disconnectViaArray(
        parentEntityName,
        parentId,
        relationField,
        idsToRemove
      );
    }
  }

  /**
   * Delete directly from junction table.
   */
  private async deleteFromJunctionTable(
    junction: NonNullable<
      ReturnType<EntitySchemaRegistry["getJunctionConfig"]>
    >,
    parentId: string,
    targetIds: string[]
  ): Promise<void> {
    const em = this.config.entityManager;
    try {
      await em.query(
        `DELETE FROM "${junction.table}"
         WHERE "${junction.sourceKey}" = $1
         AND "${junction.targetKey}" = ANY($2)`,
        [parentId, targetIds]
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

  /**
   * Disconnect via array manipulation (fallback).
   */
  private async disconnectViaArray(
    parentEntityName: string,
    parentId: string,
    relationField: string,
    idsToRemove: string[]
  ): Promise<void> {
    const em = this.config.entityManager;
    const ParentClass = this.getEntityClass(parentEntityName);
    try {
      const parent = await em.findOne(ParentClass, {
        where: this.config.registry.buildWhereById(parentEntityName, parentId),
        relations: { [relationField]: true },
      });
      if (!parent) {
        throw new TypeORMAdapterError(
          `[TypeORMBatchExecutor] Parent ${parentEntityName} with id ${parentId} not found for disconnect`
        );
      }
      parent[relationField] = parent[relationField].filter(
        (item: any) => !idsToRemove.includes(this.extractId(item) ?? "")
      );
      await em.save(parent);
    } catch (error: any) {
      throw new BatchOperationError(
        "disconnect",
        parentEntityName,
        error.message || "Failed to disconnect via array manipulation",
        error
      );
    }
  }

  /**
   * Execute create operations.
   * - For 'owned' collections: create entities
   * - For 'reference' collections: connect existing entities
   */
  private async executeCreates(
    creates: Array<{
      entity: string;
      depth: number;
      items: Array<{
        data: any;
        parentId?: string;
        parentEntity?: string;
        relationField?: string;
      }>;
    }>
  ): Promise<void> {
    const sorted = [...creates].sort((a, b) => a.depth - b.depth);
    for (const create of sorted) {
      const firstItem = create.items[0];
      if (
        firstItem?.relationField &&
        firstItem.parentEntity &&
        this.config.registry.isReferenceCollection(
          firstItem.parentEntity,
          firstItem.relationField
        )
      ) {
        await this.connectToParent(
          firstItem.parentEntity,
          firstItem.relationField,
          create.items
        );
      } else {
        await this.createEntities(create.entity, create.items);
      }
    }
  }

  /**
   * Create entities (for owned collections or aggregate roots).
   */
  private async createEntities(
    entityName: string,
    items: Array<{ data: any; parentId?: string }>
  ): Promise<void> {
    if (items.length === 0) return;
    const em = this.config.entityManager;
    const EntityClass = this.getEntityClass(entityName);
    try {
      const instances = items.map((item) => {
        const entity = new EntityClass();
        const mappedData = this.config.registry.mapEntity(
          entityName,
          item.data
        );
        Object.assign(entity, mappedData);
        if (item.parentId) {
          const parentFk = this.config.registry.getParentFk(
            entityName,
            item.parentId
          );
          if (parentFk) {
            Object.assign(entity, parentFk);
          }
        }
        return entity;
      });
      await em.save(instances);
    } catch (error: any) {
      throw new BatchOperationError(
        "create",
        entityName,
        error.message || "Unknown error during creation",
        error
      );
    }
  }

  /**
   * Connect N:N relationships.
   * Uses junction table if configured, otherwise manipulates array.
   */
  private async connectToParent(
    parentEntityName: string,
    relationField: string,
    items: Array<{
      data: any;
      parentId?: string;
      parentEntity?: string;
    }>
  ): Promise<void> {
    if (items.length === 0) return;
    const junctionConfig = this.config.registry.getJunctionConfig(
      parentEntityName,
      relationField
    );
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
    if (junctionConfig) {
      await this.insertIntoJunctionTable(junctionConfig, grouped);
    } else {
      for (const [parentId, entityIds] of grouped) {
        await this.connectViaArray(
          parentEntityName,
          parentId,
          relationField,
          entityIds
        );
      }
    }
  }

  /**
   * Insert directly into junction table.
   */
  private async insertIntoJunctionTable(
    junction: NonNullable<
      ReturnType<EntitySchemaRegistry["getJunctionConfig"]>
    >,
    grouped: Map<string, string[]>
  ): Promise<void> {
    const em = this.config.entityManager;
    const values: Array<[string, string]> = [];
    for (const [parentId, targetIds] of grouped) {
      for (const targetId of targetIds) {
        values.push([parentId, targetId]);
      }
    }
    if (values.length === 0) return;
    try {
      const placeholders = values
        .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
        .join(", ");
      const flatValues = values.flat();
      await em.query(
        `INSERT INTO "${junction.table}" ("${junction.sourceKey}", "${junction.targetKey}")
         VALUES ${placeholders}
         ON CONFLICT DO NOTHING`,
        flatValues
      );
    } catch (error: any) {
      throw new BatchOperationError(
        "connect",
        junction.table,
        error.message || "Failed to insert into junction table",
        error
      );
    }
  }

  /**
   * Connect via array manipulation (fallback).
   */
  private async connectViaArray(
    parentEntityName: string,
    parentId: string,
    relationField: string,
    entityIds: string[]
  ): Promise<void> {
    const em = this.config.entityManager;
    const ParentClass = this.getEntityClass(parentEntityName);
    const collectionConfig = this.config.registry.getCollectionConfig(
      parentEntityName,
      relationField
    );
    if (!collectionConfig?.entity) {
      throw new BatchOperationError(
        "connect",
        parentEntityName,
        `No target entity configured for ${parentEntityName}.${relationField}`
      );
    }
    const TargetClass = this.getEntityClass(collectionConfig.entity);
    try {
      const parent = await em.findOne(ParentClass, {
        where: this.config.registry.buildWhereById(parentEntityName, parentId),
        relations: { [relationField]: true },
      });
      if (!parent) {
        throw new TypeORMAdapterError(
          `[TypeORMBatchExecutor] Parent ${parentEntityName} with id ${parentId} not found for connect`
        );
      }
      const targets = await em.find(TargetClass, {
        where: {
          [this.config.registry.getPrimaryKeyField(collectionConfig.entity)]:
            In(entityIds),
        },
      });
      if (!parent[relationField]) {
        parent[relationField] = [];
      }
      parent[relationField].push(...targets);
      await em.save(parent);
    } catch (error: any) {
      throw new BatchOperationError(
        "connect",
        parentEntityName,
        error.message || "Failed to connect via array manipulation",
        error
      );
    }
  }

  /**
   * Execute update operations.
   */
  private async executeUpdates(
    updates: Array<{
      entity: string;
      items: Array<{ id: string; changedFields: Record<string, any> }>;
    }>
  ): Promise<void> {
    for (const upd of updates) {
      const EntityClass = this.getEntityClass(upd.entity);
      const em = this.config.entityManager;
      for (const item of upd.items) {
        const mappedFields = this.config.registry.mapFields(
          upd.entity,
          item.changedFields
        );
        if (Object.keys(mappedFields).length > 0) {
          try {
            await em.update(
              EntityClass,
              this.config.registry.buildWhereById(upd.entity, item.id),
              mappedFields
            );
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

  /**
   * Get entity class from registry.
   */
  private getEntityClass(entityName: string): new () => ObjectLiteral {
    const EntityClass = this.config.entityClasses.get(entityName);
    if (!EntityClass) {
      throw new EntityClassNotFoundError(
        entityName,
        Array.from(this.config.entityClasses.keys())
      );
    }
    return EntityClass;
  }

  /**
   * Extract ID from entity data.
   */
  private extractId(data: any): string | undefined {
    if (data.id?.value) return data.id.value;
    if (typeof data.id === "string") return data.id;
    return undefined;
  }
}

/**
 * Execute batch operations from changes.
 * Convenience function for one-off usage.
 */
export async function executeBatch(
  entityManager: EntityManager,
  changes: AggregateChanges,
  config: Omit<TypeORMBatchExecutorConfig, "entityManager">
): Promise<void> {
  const executor = new TypeORMBatchExecutor({
    ...config,
    entityManager,
  });
  await executor.execute(changes);
}
