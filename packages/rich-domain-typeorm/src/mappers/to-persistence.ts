import { EntityManager } from "typeorm";
import { AggregateChanges, EntitySchemaRegistry } from "@woltz/rich-domain";
import { TypeORMUnitOfWork } from "../unit-of-work";
import { TypeORMBatchExecutor, TypeORMBatchExecutorConfig } from "../batch-executor";

/**
 * Base class for mapping domain aggregates to TypeORM persistence.
 *
 * Handles:
 * - Initial creation (onCreate)
 * - Updates with change tracking (onUpdate via BatchExecutor)
 * - Automatic transaction context usage
 *
 * @example
 * ```typescript
 * class PostToPersistenceMapper extends TypeORMToPersistence<Post> {
 *   protected readonly registry = new EntitySchemaRegistry()
 *     .register({
 *       entity: 'Post',
 *       table: 'posts',
 *       collections: {
 *         comments: { type: 'owned', entity: 'Comment' },
 *         tags: {
 *           type: 'reference',
 *           entity: 'Tag',
 *           junction: {
 *             table: 'post_tags',
 *             sourceKey: 'postId',
 *             targetKey: 'tagId'
 *           }
 *         }
 *       }
 *     });
 *
 *   protected readonly entityClasses = new Map([
 *     ['Post', PostEntity],
 *     ['Comment', CommentEntity],
 *     ['Tag', TagEntity]
 *   ]);
 *
 *   protected async onCreate(aggregate: Post, em: EntityManager): Promise<void> {
 *     const entity = new PostEntity();
 *     entity.id = aggregate.id.value;
 *     entity.title = aggregate.title;
 *     entity.content = aggregate.content;
 *     await em.save(entity);
 *   }
 * }
 * ```
 */
export abstract class TypeORMToPersistence<TDomain> {
  /**
   * Schema registry for entity/table mapping.
   * Must be implemented by subclass.
   */
  protected abstract readonly registry: EntitySchemaRegistry;

  /**
   * Map of entity names to TypeORM entity classes.
   * Must be implemented by subclass.
   */
  protected abstract readonly entityClasses: Map<string, new () => any>;

  constructor(protected readonly uow: TypeORMUnitOfWork) {}

  /**
   * Save aggregate (create or update).
   *
   * Automatically detects:
   * - New aggregates → calls onCreate
   * - Existing aggregates with changes → uses BatchExecutor
   * - No changes → skips operation
   */
  async save(aggregate: TDomain): Promise<void> {
    const em = this.uow.getCurrentEntityManager();

    // Check if aggregate has change tracking
    if (this.hasChangeTracking(aggregate)) {
      const changes = (aggregate as any).getChanges() as AggregateChanges;

      if (changes.isEmpty()) {
        return; // No changes to persist
      }

      // Use BatchExecutor for updates
      const executor = new TypeORMBatchExecutor({
        registry: this.registry,
        entityManager: em,
        entityClasses: this.entityClasses,
      });

      await executor.execute(changes);
    } else {
      // Initial creation (no change tracking yet)
      await this.onCreate(aggregate, em);
    }
  }

  /**
   * Create initial aggregate.
   *
   * Called when aggregate is being persisted for the first time.
   * Subclasses must implement this to handle initial creation.
   *
   * @param aggregate - Domain aggregate to create
   * @param em - EntityManager (with transaction context if active)
   */
  protected abstract onCreate(
    aggregate: TDomain,
    em: EntityManager
  ): Promise<void>;

  /**
   * Update aggregate (optional override).
   *
   * By default, uses BatchExecutor to handle changes.
   * Subclasses can override for custom update logic.
   *
   * @param aggregate - Domain aggregate to update
   * @param changes - Detected changes
   * @param em - EntityManager (with transaction context if active)
   */
  protected async onUpdate(
    _aggregate: TDomain,
    changes: AggregateChanges,
    em: EntityManager
  ): Promise<void> {
    const executor = new TypeORMBatchExecutor({
      registry: this.registry,
      entityManager: em,
      entityClasses: this.entityClasses,
    });

    await executor.execute(changes);
  }

  /**
   * Check if aggregate has change tracking.
   */
  private hasChangeTracking(aggregate: TDomain): boolean {
    return (
      typeof (aggregate as any).getChanges === "function" &&
      typeof (aggregate as any).getChanges() === "object"
    );
  }

  /**
   * Get current EntityManager from UoW.
   */
  protected getEntityManager(): EntityManager {
    return this.uow.getCurrentEntityManager();
  }

  /**
   * Get BatchExecutor configuration.
   *
   * Useful for subclasses that need to customize executor behavior.
   */
  protected getExecutorConfig(): Omit<TypeORMBatchExecutorConfig, "entityManager"> {
    return {
      registry: this.registry,
      entityClasses: this.entityClasses,
    };
  }
}