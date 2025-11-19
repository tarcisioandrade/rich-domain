// ============================================================================
// Base Repository - Abstract implementation with common logic
// ============================================================================

import type { Id } from "../id";
import type { Aggregate } from "../entity";
import type { Criteria } from "../criteria";
import { PaginatedResult } from "../paginated-result";
import type { IRepository } from "../types";
import type { IMapper } from "./mapper";

/**
 * Abstract base repository
 * Implements common logic, delegates persistence to subclasses
 *
 * @example
 * ```ts
 * class UserRepository extends BaseRepository<User, PrismaUser> {
 *   constructor(prisma: PrismaClient) {
 *     super(new UserMapper());
 *     this.prisma = prisma;
 *   }
 *
 *   protected async insertOne(data: PrismaUser): Promise<PrismaUser> {
 *     return this.prisma.user.create({ data });
 *   }
 *
 *   protected async updateOne(id: string, data: PrismaUser): Promise<PrismaUser> {
 *     return this.prisma.user.update({ where: { id }, data });
 *   }
 *
 *   // ... implement other abstract methods
 * }
 * ```
 */
export abstract class BaseRepository<
  TDomain extends Aggregate<any>,
  TPersistence = any
> implements IRepository<TDomain>
{
  constructor(protected readonly mapper: IMapper<TDomain, TPersistence>) {}

  // ============================================================================
  // Abstract methods - Must be implemented by subclasses
  // ============================================================================

  /**
   * Insert new record in database
   */
  protected abstract insertOne(data: TPersistence): Promise<TPersistence>;

  /**
   * Update existing record in database
   */
  protected abstract updateOne(
    id: string,
    data: TPersistence
  ): Promise<TPersistence>;

  /**
   * Delete record from database
   */
  protected abstract deleteOne(id: string): Promise<void>;

  /**
   * Find record by ID in database
   */
  protected abstract findOneById(id: string): Promise<TDomain | null>;

  /**
   * Find all records in database (no filtering)
   */
  protected abstract findMany(): Promise<TDomain[]>;

  /**
   * Apply criteria to query (filtering, ordering, pagination)
   * Returns [data, total]
   */
  protected abstract applyCriteria(
    criteria: Criteria<TDomain>
  ): Promise<PaginatedResult<TDomain>>;

  /**
   * Count records matching criteria
   */
  protected abstract countByCriteria(
    criteria?: Criteria<TDomain>
  ): Promise<number>;

  /**
   * Check if record exists by ID
   */
  protected abstract existsById(id: string): Promise<boolean>;

  // ============================================================================
  // Public API - Implemented using abstract methods
  // ============================================================================

  async findById(id: Id): Promise<TDomain | null> {
    const domain = await this.findOneById(id.value);
    if (!domain) return null;
    return domain;
  }

  async find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>> {
    return await this.applyCriteria(criteria);
  }

  async findAll(criteria?: Criteria<TDomain>): Promise<TDomain[]> {
    if (criteria) {
      const result = await this.find(criteria);
      return result.data;
    }

    const domains = await this.findMany();
    return domains;
  }

  async findOne(criteria: Criteria<TDomain>): Promise<TDomain | null> {
    // Limit to 1 result
    const limitedCriteria = criteria.clone().limit(1);
    const result = await this.find(limitedCriteria);

    return result.data.length > 0 ? result.data[0] : null;
  }

  async save(aggregate: TDomain): Promise<void> {
    const persistence = this.mapper.toPersistence(aggregate);

    if (aggregate.isNew) {
      await this.insertOne(persistence);
    } else {
      await this.updateOne(aggregate.id.value, persistence);
    }
  }

  async delete(aggregate: TDomain): Promise<void> {
    await this.deleteOne(aggregate.id.value);
  }

  async deleteById(id: Id): Promise<void> {
    await this.deleteOne(id.value);
  }

  async exists(id: Id): Promise<boolean> {
    return this.existsById(id.value);
  }

  async count(criteria?: Criteria<TDomain>): Promise<number> {
    return this.countByCriteria(criteria);
  }
}
