import type { Aggregate } from "../core/entities.js";
import type { Criteria } from "../criteria.js";
import { PaginatedResult } from "./paginated-result.js";
import { Mapper } from "./mapper.js";

export abstract class ReadRepository<Agg extends Aggregate<any>> {
  /**
   * Find entities based on criteria.
   * @param criteria - The criteria to use for the search. If not provided, all entities will be returned. (optional)
   * @returns A promise that resolves to a paginated result of entities.
   */
  abstract find(criteria?: Criteria<Agg>): Promise<PaginatedResult<Agg>>;
  abstract findById(id: string): Promise<Agg | null>;
  abstract findManyByIds(ids: string[]): Promise<Agg[]>;
  /**
   * Count the number of entities based on criteria.
   * @param criteria - The criteria to use for the count. If not provided, all entities will be counted. (optional)
   * @returns A promise that resolves to the number of entities.
   */
  abstract count(criteria?: Criteria<Agg>): Promise<number>;
  /**
   * Check if an entity exists based on its identifier.
   * @param id - The identifier of the entity to check.
   * @returns A promise that resolves to a boolean.
   */
  abstract exists(id: string): Promise<boolean>;
}

export abstract class WriteRepository<Agg extends Aggregate<any>> {
  /**
   *
   * Save or update an entity.
   * @param entity - The entity to save.
   * @returns void
   */
  abstract save(entity: Agg): Promise<void>;
  abstract delete(entity: Agg): Promise<void>;
}

export abstract class WriteAndRead<Agg extends Aggregate<any>> {
  /**
   * Find entities based on criteria.
   * @param criteria - The criteria to use for the search. If not provided, all entities will be returned. (optional)
   * @returns A promise that resolves to a paginated result of entities.
   */
  abstract find(criteria?: Criteria<Agg>): Promise<PaginatedResult<Agg>>;
  abstract findById(id: string): Promise<Agg | null>;
  abstract findManyByIds(ids: string[]): Promise<Agg[]>;
  /**
   *
   * Save or update an entity.
   * @param entity - The entity to save.
   * @returns void
   */
  abstract save(entity: Agg): Promise<void>;
  abstract delete(entity: Agg): Promise<void>;
  /**
   * Count the number of entities based on criteria.
   * @param criteria - The criteria to use for the count. If not provided, all entities will be counted. (optional)
   * @returns A promise that resolves to the number of entities.
   */
  abstract count(criteria?: Criteria<Agg>): Promise<number>;
  /**
   * Check if an entity exists based on its identifier.
   * @param id - The identifier of the entity to check.
   * @returns A promise that resolves to a boolean.
   */
  abstract exists(id: string): Promise<boolean>;
}

export abstract class Repository<
  TDomain extends Aggregate<any>,
> extends WriteAndRead<TDomain> {
  protected abstract readonly toDomainMapper: Mapper<unknown, TDomain>;
  protected abstract readonly toPersistenceMapper: Mapper<TDomain, unknown>;
  /**
   * Provide the model name of the repository. Usually the table name in the database.
   * @returns The model name of the repository.
   */
  protected abstract get model(): any;
}
