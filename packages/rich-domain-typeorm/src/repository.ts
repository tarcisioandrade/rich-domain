import { Repository as TypeORMRepositoryBase, ObjectLiteral, FindOptionsWhere } from "typeorm";
import { Criteria } from "@woltz/rich-domain";
import { TypeORMQueryBuilder, SearchableField } from "./criteria/query-builder";
import { TypeORMRepositoryError } from "./errors";
import { TypeORMUnitOfWork } from "./unit-of-work";

/**
 * Configuration for TypeORM Repository.
 */
export interface TypeORMRepositoryConfig<TDomain, TEntity extends ObjectLiteral> {
  /**
   * TypeORM repository instance.
   */
  typeormRepository: TypeORMRepositoryBase<TEntity>;

  /**
   * Mapper from TypeORM entity to domain entity.
   */
  toDomainMapper: (entity: TEntity) => TDomain;

  /**
   * Mapper from domain entity to TypeORM entity.
   */
  toPersistenceMapper: (domain: TDomain) => TEntity;

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
  TDomain,
  TEntity extends ObjectLiteral
> {
  protected readonly typeormRepo: TypeORMRepositoryBase<TEntity>;
  protected readonly toDomainMapper: (entity: TEntity) => TDomain;
  protected readonly toPersistenceMapper: (domain: TDomain) => TEntity;
  protected readonly uow: TypeORMUnitOfWork;
  protected readonly alias: string;

  constructor(config: TypeORMRepositoryConfig<TDomain, TEntity>) {
    this.typeormRepo = config.typeormRepository;
    this.toDomainMapper = config.toDomainMapper;
    this.toPersistenceMapper = config.toPersistenceMapper;
    this.uow = config.uow;
    this.alias = config.alias ?? "entity";
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
   * @returns Array of field names to search in
   *
   * @example
   * ```typescript
   * import { SearchableField } from '@woltz/rich-domain-typeorm';
   *
   * class UserRepository extends TypeORMRepository<User, UserEntity> {
   *   // Type-safe searchable fields (recommended)
   *   protected getSearchableFields(): SearchableField<UserEntity>[] {
   *     return [
   *       'name',           // Direct field
   *       'email',          // Direct field
   *       'posts.title',    // Nested relation field (auto-joins posts)
   *       'profile.bio'     // Nested relation field (auto-joins profile)
   *     ];
   *   }
   * }
   *
   * // Usage:
   * const criteria = Criteria.create<User>()
   *   .search('john')  // Searches in all defined fields
   *   .paginate(1, 10);
   *
   * const users = await userRepository.find(criteria);
   *
   * // Generated SQL:
   * // SELECT user.*
   * // FROM user
   * // LEFT JOIN posts ON user.id = posts.userId
   * // LEFT JOIN profile ON user.id = profile.userId
   * // WHERE (
   * //   user.name LIKE '%john%' OR
   * //   user.email LIKE '%john%' OR
   * //   posts.title LIKE '%john%' OR
   * //   profile.bio LIKE '%john%'
   * // )
   * // LIMIT 10
   * ```
   */
  protected getSearchableFields(): SearchableField<TEntity>[] {
    return [];
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

      const entity = await repo.findOne({
        where: { id } as unknown as FindOptionsWhere<TEntity>,
      });

      return entity ? this.toDomainMapper(entity as TEntity) : null;
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
   * @param criteria - Query criteria
   * @returns Array of domain entities
   */
  async find(criteria: Criteria<TDomain>): Promise<TDomain[]> {
    try {
      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      const qb = repo.createQueryBuilder(this.alias);

      // Apply criteria to query builder
      TypeORMQueryBuilder.apply(
        qb,
        criteria,
        this.alias,
        this.getSearchableFields()
      );

      const entities = await qb.getMany();

      return entities.map((entity) =>
        this.toDomainMapper(entity as TEntity)
      );
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to find ${this.alias}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Find one entity matching criteria.
   *
   * @param criteria - Query criteria
   * @returns Domain entity or null if not found
   */
  async findOne(criteria: Criteria<TDomain>): Promise<TDomain | null> {
    try {
      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      const qb = repo.createQueryBuilder(this.alias);

      // Apply criteria to query builder
      TypeORMQueryBuilder.apply(
        qb,
        criteria,
        this.alias,
        this.getSearchableFields()
      );

      const entity = await qb.getOne();

      return entity ? this.toDomainMapper(entity as TEntity) : null;
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to find one ${this.alias}: ${error.message}`,
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
          search
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
   * Uses the toPersistenceMapper to handle domain → persistence conversion.
   * Delegates actual save logic to the mapper (which may use BatchExecutor).
   *
   * @param aggregate - Domain entity to save
   */
  async save(aggregate: TDomain): Promise<void> {
    try {
      const entity = this.toPersistenceMapper(aggregate);

      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      await repo.save(entity as any);
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
      const entity = this.toPersistenceMapper(aggregate);

      const em = this.uow.getCurrentEntityManager();
      const repo = em.getRepository(this.typeormRepo.target);

      await repo.remove(entity as any);
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

      const entities = await repo.find();

      return entities.map((entity) =>
        this.toDomainMapper(entity as TEntity)
      );
    } catch (error: any) {
      throw new TypeORMRepositoryError(
        `Failed to find all ${this.alias}: ${error.message}`,
        error
      );
    }
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