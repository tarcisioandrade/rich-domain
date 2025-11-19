import { Criteria } from "../criteria";
import { Aggregate } from "../entity";
import { Id } from "../id";
import { PaginatedResult } from "../paginated-result";

export interface IRepository<TDomain extends Aggregate<any>> {
  /**
   * Find by ID
   */
  findById(id: Id): Promise<TDomain | null>;

  /**
   * Find using criteria (filtering, ordering, pagination)
   */
  find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>>;

  /**
   * Find all (with optional criteria)
   */
  findAll(criteria?: Criteria<TDomain>): Promise<TDomain[]>;

  /**
   * Find one (first matching criteria)
   */
  findOne(criteria: Criteria<TDomain>): Promise<TDomain | null>;

  /**
   * Save (insert or update based on aggregate.isNew)
   */
  save(aggregate: TDomain): Promise<void>;

  /**
   * Delete aggregate
   */
  delete(aggregate: TDomain): Promise<void>;

  /**
   * Delete by ID
   */
  deleteById(id: Id): Promise<void>;

  /**
   * Check if exists
   */
  exists(id: Id): Promise<boolean>;

  /**
   * Count matching criteria
   */
  count(criteria?: Criteria<TDomain>): Promise<number>;
}
