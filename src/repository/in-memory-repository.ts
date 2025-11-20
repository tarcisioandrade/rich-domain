// ============================================================================
// In-Memory Repository - Perfect for testing
// ============================================================================

import type { Aggregate } from "../entity";
import type { Criteria } from "../criteria";
import { PaginatedResult } from "../paginated-result";
import { Repository } from "./base-repository";
import { Mapper } from "../mapper";

/**
 * In-memory repository implementation
 * Perfect for unit tests and prototyping
 *
 * @example
 * ```ts
 * const userRepo = new InMemoryRepository<User>();
 *
 * await userRepo.save(user);
 * const found = await userRepo.findById(user.id);
 * const active = await userRepo.find(
 *   Criteria.create<User>().whereEquals('status', 'active')
 * );
 * ```
 */
export class InMemoryRepository<
  TDomain extends Aggregate<any>
> extends Repository<TDomain> {
  protected items: Map<string, TDomain> = new Map();

  constructor(
    protected readonly mapperToDomain: Mapper<unknown, TDomain>,
    protected readonly mapperToPersistence: Mapper<TDomain, unknown>
  ) {
    super();
  }

  get model(): any {
    // your database table name
    return "inMemory";
  }

  async findById(id: string): Promise<TDomain | null> {
    return this.items.get(id) || null;
  }

  async find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>> {
    const allItems = Array.from(this.items.values());
    return PaginatedResult.fromArray(allItems, criteria);
  }

  async findAll(criteria?: Criteria<TDomain>): Promise<TDomain[]> {
    if (criteria) {
      const result = await this.find(criteria);
      return result.data;
    }

    return Array.from(this.items.values());
  }

  async findOne(criteria: Criteria<TDomain>): Promise<TDomain | null> {
    const result = await this.find(criteria.clone().limit(1));
    return result.data.length > 0 ? result.data[0] : null;
  }

  async create(aggregate: TDomain): Promise<void> {
    this.items.set(aggregate.id.value, aggregate);
  }

  async update(entity: TDomain): Promise<void> {
    this.items.set(entity.id.value, entity);
  }

  async createMany(aggregates: TDomain[]): Promise<void> {
    for (const aggregate of aggregates) {
      await this.create(aggregate);
    }
  }

  async delete(aggregate: TDomain): Promise<void> {
    this.items.delete(aggregate.id.value);
  }

  async exists(id: string): Promise<boolean> {
    return this.items.has(id);
  }

  async count(criteria?: Criteria<TDomain>): Promise<number> {
    if (criteria) {
      const result = await this.find(criteria);
      return result.meta.total;
    }
    return this.items.size;
  }

  /**
   * Clear all items (useful for test cleanup)
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Get all items as array (useful for debugging)
   */
  getAll(): TDomain[] {
    return Array.from(this.items.values());
  }

  /**
   * Get items count
   */
  size(): number {
    return this.items.size;
  }
}
