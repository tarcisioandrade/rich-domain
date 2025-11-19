// ============================================================================
// In-Memory Repository - Perfect for testing
// ============================================================================

import type { Id } from "../id";
import type { Aggregate } from "../entity";
import type { Criteria } from "../criteria";
import { PaginatedResult } from "../paginated-result";
import type { IRepository } from "../types";

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
export class InMemoryRepository<TDomain extends Aggregate<any>>
  implements IRepository<TDomain>
{
  protected items: Map<string, TDomain> = new Map();

  async findById(id: Id): Promise<TDomain | null> {
    return this.items.get(id.value) || null;
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

  async save(aggregate: TDomain): Promise<void> {
    this.items.set(aggregate.id.value, aggregate);
  }

  async saveMany(aggregates: TDomain[]): Promise<void> {
    for (const aggregate of aggregates) {
      await this.save(aggregate);
    }
  }

  async delete(aggregate: TDomain): Promise<void> {
    this.items.delete(aggregate.id.value);
  }

  async deleteById(id: Id): Promise<void> {
    this.items.delete(id.value);
  }

  async exists(id: Id): Promise<boolean> {
    return this.items.has(id.value);
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
