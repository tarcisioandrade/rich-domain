import {
  Repository as TypeORMRepositoryBase,
  ObjectLiteral,
  FindOptionsWhere,
} from "typeorm";
import {
  Aggregate,
  Criteria,
  Repository,
  Mapper,
  PaginatedResult,
} from "@woltz/rich-domain";
import { TypeORMQueryBuilder, SearchableField } from "./criteria/query-builder";
import { TypeORMRepositoryError } from "./errors";
import { TypeORMUnitOfWork } from "./unit-of-work";
import { TypeORMToPersistence } from "./mappers/to-persistence";

/**
 * Configuration for TypeORM Repository.
 */
export interface TypeORMRepositoryConfig<
  TDomain,
  TEntity extends ObjectLiteral,
> {
  /**
   * TypeORM repository instance.
   */
  typeormRepository: TypeORMRepositoryBase<TEntity>;

  /**
   * Mapper from TypeORM entity to domain entity.
   */
  toDomainMapper: Mapper<TEntity, TDomain>;

  /**
   * Mapper from domain entity to TypeORM entity for persistence operations.
   */
  toPersistenceMapper: TypeORMToPersistence<TDomain>;

  /**
   * Unit of Work instance for transaction management.
   */
  uow: TypeORMUnitOfWork;

  /**
   * Alias to use in QueryBuilder (defaults to 'entity').
   */
  alias?: string;
}

/**
 * Base repository for TypeORM with rich-domain integration.
 *
 * Provides:
 * - CRUD operations with domain entities
 * - Criteria-based queries
 * - Automatic transaction support
 * - Mapping between domain and persistence layers
 *
 * @example
 * ```typescript
 * class UserRepository extends TypeORMRepository<User, UserEntity> {
 *   constructor(
 *     typeormRepo: Repository<UserEntity>,
 *     toDomainMapper: UserToDomainMapper,
 *     toPersistenceMapper: UserToPersistenceMapper,
 *     uow: TypeORMUnitOfWork
 *   ) {
 *     super({
 *       typeormRepository: typeormRepo,
 *       toDomainMapper: (entity) => toDomainMapper.map(entity),
 *       toPersistenceMapper: (domain) => toPersistenceMapper.map(domain),
 *       uow,
 *       alias: 'user'
 *     });
 *   }
 * }
 * ```
 */
export abstract class TypeORMRepository<
  TDomain extends Aggregate<any>,
  TEntity extends ObjectLiteral,
> extends Repository<TDomain> {
  protected readonly typeormRepo: TypeORMRepositoryBase<TEntity>;
  protected readonly toDomainMapper: Mapper<TEntity, TDomain>;
  private readonly _toPersistenceMapper: TypeORMToPersistence<TDomain>;
  protected readonly uow: TypeORMUnitOfWork;
  protected readonly alias: string;

  constructor(config: TypeORMRepositoryConfig<TDomain, TEntity>) {
    super();
    this.typeormRepo = config.typeormRepository;
    this.toDomainMapper = config.toDomainMapper;
    this._toPersistenceMapper = config.toPersistenceMapper;
    this.uow = config.uow;
    this.alias = config.alias ?? "entity";
  }

  /**
   * Get the underlying TypeORM entity model/target.
   */
  protected get model(): any {
    return this.typeormRepo.target;
  }

  /**
   * Mapper from domain to persistence (required by base Repository).
   * Note: For save operations, use the TypeORMToPersistence directly.
   */
  protected get toPersistenceMapper(): Mapper<TDomain, TEntity> {
    // This is a wrapper to satisfy the Repository base class contract
    // The actual persistence logic uses TypeORMToPersistence
    return {
      build: () => {
        throw new TypeORMRepositoryError(
          "Direct persistence mapping is not supported. Use save() method instead."
        );
      },
      buildMany: () => {
        throw new TypeORMRepositoryError(
          "Direct persistence mapping is not supported. Use save() method instead."
        );
      },
    } as Mapper<TDomain, TEntity>;
  }

  /**
   * Define which relations to load by default.
   *
   * Override in subclass to specify default relations to include.
   * Similar to Prisma's `include` option.
   *
   * @returns Array of relation names to load
   *
   * @example
   * ```typescript
   * class UserRepository extends TypeORMRepository<User, UserEntity> {
   *   protected getDefaultRelations(): string[] {
   *     return ['posts', 'posts.tags', 'profile'];
   *   }
   * }
   *
   * // Now all queries will automatically include posts, tags, and profile
   * const user = await userRepository.findById('123');
   * // user.posts will be loaded
   * // user.posts[0].tags will be loaded
   * // user.profile will be loaded
   * ```
   */
  protected getDefaultRelations(): string[] {
    return [];
  }

  /**
   * Define which fields should be searchable when using Criteria.search().
   *
   * Override in subclass to enable search functionality.
   * Use SearchableField<TEntity> for type-safe field definitions.
   *
   * Supports both direct entity fields and nested relation fields.
   * Nested fields automatically trigger LEFT JOINs.
   *
   * By default, searches are case-insensitive (using LOWER()).
   * You can configure case sensitivity per field using SearchableFieldConfig.
   *
   * @returns Array of field names or field configurations to search in
   *
   * @example
   * ```typescript
   * import { SearchableField } from '@woltz/rich-domain-typeorm';
   *
   * // Simple case-insensitive search (default)
   * class UserRepository extends TypeORMRepository<User, UserEntity> {
   *   protected getSearchableFields(): SearchableField<UserEntity>[] {
   *     return [
   *       'name',           // Case-insensitive
   *       'email',          // Case-insensitive
   *       'posts.title',    // Nested relation (case-insensitive)
   *     ];
   *   }
   * }
   *
   * // Mixed case sensitivity
   * class ProductRepository extends TypeORMRepository<Product, ProductEntity> {
   *   protected getSearchableFields(): SearchableField<ProductEntity>[] {
   *     return [
   *       'name',                                      // Case-insensitive
   *       { field: 'code', caseSensitive: true },      // Case-sensitive
   *       { field: 'description', caseSensitive: false }, // Case-insensitive (explicit)
   *       'category.name'                              // Case-insensitive
   *     ];
   *   }
   * }
   *
   * // Usage:
   * const criteria = Criteria.create<User>()
   *   .search('john')  // Searches in all defined fields (case-insensitive by default)
   *   .paginate(1, 10);
   *
   * const users = await userRepository.find(criteria);
   *
   * // Generated SQL (case-insensitive):
   * // SELECT user.*
   * // FROM user
   * // LEFT JOIN posts ON user.id = posts.userId
   * // WHERE (
   * //   LOWER(user.name) LIKE LOWER('%john%') OR
   * //   LOWER(user.email) LIKE LOWER('%john%') OR
   * //   LOWER(posts.title) LIKE LOWER('%john%')
   * // )
   * // LIMIT 10
   * ```
   */
  protected getSearchableFields(): SearchableField<TEntity>[] {
    return [];
  }

  /**
   * Apply relations to QueryBuilder using leftJoinAndSelect.
   *
   * @param qb - QueryBuilder instance
   * @param alias - Base alias
   */
  private applyRelationsToQueryBuilder(qb: any, alias: string): void {
    const relations = this.getDefaultRelations();

    relations.forEach((relation) => {
      // Handle nested relations (e.g., 'posts.tags')
      const parts = relation.split(".");
      let currentAlias = alias;

      parts.forEach((part, index) => {
        const joinAlias = parts.slice(0, index + 1).join("_");

        // Only add if not already joined
        const existingJoin = qb.expressionMap.joinAttributes.find(
          (j: any) => j.alias.name === joinAlias
        );

        if (!existingJoin) {
          qb.leftJoinAndSelect(
            index === 0 ? `${currentAlias}.${part}` : `${currentAlias}.${part}`,
            joinAlias
          );
        }

        currentAlias = joinAlias;
      });
    });
  }

  /**
   * Find entity by ID.
   *
   * @param id - Entity ID
   * @returns Domain entity or null if not found
   */
  async findById(id: string): Promise<TDomain | null> {
    try {
      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      const relations = this.getDefaultRelations();
      const entity = await repo.findOne({
        where: { id } as unknown as FindOptionsWhere<TEntity>,
        relations: relations.length > 0 ? relations : undefined,
      });

      if (!entity) return null;

      return this.toDomainMapper.build(entity as TEntity);
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to find ${this.alias} by ID: ${error.message}`,
        error
      );
    }
  }

  /**
   * Find all entities matching criteria.
   *
   * @param criteria - Query criteria (optional)
   * @returns Paginated result with domain entities
   */
  async find(criteria?: Criteria<TDomain>): Promise<PaginatedResult<TDomain>> {
    try {
      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      const qb = repo.createQueryBuilder(this.alias);

      // Apply default relations
      this.applyRelationsToQueryBuilder(qb, this.alias);

      // Apply criteria to query builder if provided
      if (criteria) {
        TypeORMQueryBuilder.apply(
          qb,
          criteria,
          this.alias,
          this.getSearchableFields()
        );
      }

      const [entities, total] = await qb.getManyAndCount();

      const items = this.toDomainMapper.buildMany(entities as TEntity[]);

      // Extract pagination info from criteria
      const pagination = criteria?.getPagination() ?? {
        page: 1,
        limit: total || 10,
        offset: 0,
      };

      return PaginatedResult.create(items, pagination, total);
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to find ${this.alias}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Count entities matching criteria.
   *
   * @param criteria - Query criteria
   * @returns Number of entities
   */
  async count(criteria?: Criteria<TDomain>): Promise<number> {
    try {
      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      if (!criteria) {
        return await repo.count();
      }

      const qb = repo.createQueryBuilder(this.alias);

      // Apply only filters and search (ignore pagination/ordering for count)
      const filters = criteria.getFilters();
      const search = criteria.hasSearch() ? criteria.getSearch() : undefined;

      if (filters.length > 0 || search) {
        const filterOnlyCriteria = Criteria.fromObject<TDomain>({
          filters: filters as any,
          search,
        });
        TypeORMQueryBuilder.apply(
          qb,
          filterOnlyCriteria,
          this.alias,
          this.getSearchableFields()
        );
      }

      return await qb.getCount();
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to count ${this.alias}: ${error.message}`,
        error
      );
    }
  }

  async findManyByIds(ids: string[]): Promise<TDomain[]> {
    try {
      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);
      const relations = this.getDefaultRelations();

      const entities = await repo.find({
        where: { id: { in: ids } } as unknown as FindOptionsWhere<TEntity>,
        relations: relations.length > 0 ? relations : undefined,
      });

      return this.toDomainMapper.buildMany(entities as TEntity[]);
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to find many by IDs ${this.alias}: ${error.message}`,
        error
      );
    }
  }
  /**
   * Check if entity exists by ID.
   *
   * @param id - Entity ID
   * @returns true if exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    try {
      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      const count = await repo.count({
        where: { id } as unknown as FindOptionsWhere<TEntity>,
      });

      return count > 0;
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to check existence of ${this.alias}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Save entity (create or update).
   *
   * Uses the TypeORMToPersistence to handle domain → persistence conversion.
   * Delegates actual save logic to the mapper (which may use BatchExecutor).
   *
   * @param aggregate - Domain entity to save
   */
  async save(aggregate: TDomain): Promise<void> {
    try {
      await this._toPersistenceMapper.save(aggregate);
      aggregate.markAsPersisted();
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to save ${this.alias}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Delete entity.
   *
   * @param aggregate - Domain entity to delete
   */
  async delete(aggregate: TDomain): Promise<void> {
    try {
      const id = this.extractId(aggregate);
      await this.deleteById(id);
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to delete ${this.alias}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Delete entity by ID.
   *
   * @param id - Entity ID
   */
  async deleteById(id: string): Promise<void> {
    try {
      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      await repo.delete(id);
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to delete ${this.alias} by ID: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get all entities (without pagination).
   *
   * Warning: Use with caution on large datasets.
   *
   * @returns Array of all domain entities
   */
  async findAll(): Promise<TDomain[]> {
    try {
      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      const relations = this.getDefaultRelations();
      const entities = await repo.find({
        relations: relations.length > 0 ? relations : undefined,
      });

      return this.toDomainMapper.buildMany(entities as TEntity[]);
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to find all ${this.alias}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Extract ID from domain entity.
   */
  private extractId(aggregate: TDomain): string {
    // Try common patterns for getting ID
    const entity = aggregate as any;

    if (entity.id?.value) {
      return entity.id.value; // Id value object pattern
    }

    if (typeof entity.id === "string") {
      return entity.id; // Simple string ID
    }

    if (entity.getId) {
      const id = entity.getId();
      return id?.value ?? id; // Getter method
    }

    throw new TypeORMRepositoryError(
      `Cannot extract ID from ${this.alias}. ` +
        `Entity must have 'id.value', 'id' (string), or 'getId()' method.`
    );
  }

  /**
   * Get the underlying TypeORM repository.
   *
   * Use this when you need direct access to TypeORM-specific features.
   *
   * @returns TypeORM Repository instance
   */
  protected getTypeORMRepository(): TypeORMRepositoryBase<TEntity> {
    const em = this.uow.getCurrentEntityManager();
    return em.getRepository(this.typeormRepo.target);
  }
}
