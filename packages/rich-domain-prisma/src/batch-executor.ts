import { AggregateChanges, EntitySchemaRegistry } from "@woltz/rich-domain";
import { PrismaClientLike, PrismaTransactionClient } from "./unit-of-work";

export type EntityDataMapper<T = any> = (item: {
  data: T;
  parentId?: string;
  parentEntity?: string;
}) => Record<string, any>;

/**
 * Configuração para o BatchExecutor.
 * @property registry - Registro de esquema para mapeamento de tabela/campo.
 * @property dataMappers - Mapeadores de dados personalizados por entidade.
 * @property rootId - ID da entidade raiz (usado como parentId padrão para filhos).
 */
export interface BatchExecutorConfig {
  /**
   * Schema registry for table/field mapping.
   */
  registry: EntitySchemaRegistry;

  /**
   * Custom data mappers per entity.
   * Use this to transform domain objects to persistence format.
   *
   * @example
   * ```typescript
   * dataMappers: {
   *   Post: (item) => ({
   *     id: item.data.id.value,
   *     title: item.data.title,
   *     authorId: item.parentId,
   *   }),
   * }
   * ```
   */
  dataMappers?: Record<string, EntityDataMapper>;

  /**
   * Root entity ID (used as default parentId for children).
   */
  rootId?: string;
}

/**
 * Executes batch operations from AggregateChanges on Prisma.
 *
 * Handles:
 * - Deletes (leaf → root by depth DESC)
 * - Creates (root → leaf by depth ASC)
 * - Updates (any order)
 *
 * @example
 * ```typescript
 * const executor = new PrismaBatchExecutor(prisma, {
 *   registry: schemaRegistry,
 *   dataMappers: {
 *     Post: (item) => ({
 *       id: item.data.id.value,
 *       title: item.data.title,
 *       content: item.data.content,
 *       authorId: item.parentId,
 *     }),
 *   },
 *   rootId: user.id.value,
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

    const batch = changes.toBatchOperations();

    await this.executeDeletes(batch.deletes);
    await this.executeCreates(batch.creates);
    await this.executeUpdates(batch.updates);
  }

  /**
   * Execute delete operations.
   */
  private async executeDeletes(
    deletes: Array<{ entity: string; depth: number; ids: string[] }>
  ): Promise<void> {
    for (const del of deletes) {
      const table = this.config.registry.getTable(del.entity);
      const model = (this.context as any)[table];

      if (!model) {
        continue;
      }

      await model.deleteMany({
        where: { id: { in: del.ids } },
      });
    }
  }

  /**
   * Execute create operations.
   */
  private async executeCreates(
    creates: Array<{
      entity: string;
      depth: number;
      items: Array<{ data: any; parentId?: string; parentEntity?: string }>;
    }>
  ): Promise<void> {
    for (const create of creates) {
      const table = this.config.registry.getTable(create.entity);
      const model = (this.context as any)[table];

      if (!model) {
        continue;
      }

      const dataMapper = this.config.dataMappers?.[create.entity];

      const records = create.items.map((item) => {
        if (dataMapper) {
          return dataMapper({
            ...item,
            parentId: item.parentId || this.config.rootId,
          });
        }

        return {
          ...this.config.registry.mapEntity(create.entity, item.data),
          ...this.config.registry.getParentFk(
            create.entity,
            (item.parentId || this.config.rootId) ?? ""
          ),
        };
      });

      if (records.length > 0) {
        await model.createMany({
          data: records,
          skipDuplicates: true,
        });
      }
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
      const table = this.config.registry.getTable(upd.entity);
      const model = (this.context as any)[table];

      if (!model) {
        continue;
      }

      for (const item of upd.items) {
        const mappedFields = this.config.registry.mapFields(
          upd.entity,
          item.changedFields
        );

        if (Object.keys(mappedFields).length > 0) {
          await model.update({
            where: { id: item.id },
            data: mappedFields,
          });
        }
      }
    }
  }
}

/**
 * Execute batch operations from changes.
 * Convenience function for one-off usage.
 *
 * @example
 * ```typescript
 * await executeBatch(prisma, changes, {
 *   registry: schemaRegistry,
 *   rootId: user.id.value,
 * });
 * ```
 */
export async function executeBatch(
  context: PrismaClientLike | PrismaTransactionClient,
  changes: AggregateChanges,
  config: BatchExecutorConfig
): Promise<void> {
  const executor = new PrismaBatchExecutor(context, config);
  await executor.execute(changes);
}
