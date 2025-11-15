import { Pagination } from '../common/pagination';
import { PaginationCriteria } from '../common/pagination-criteria';
import { Aggregate as BaseAggregate } from './aggregate';

export type PersistenceContext = unknown;
export type WriteOptions<T = PersistenceContext> = { context?: T };

export abstract class ReadRepository<Agg extends BaseAggregate<any>> {
  abstract find(criteria: PaginationCriteria): Promise<Pagination<Agg>>;
  abstract findById(id: string): Promise<Agg | null>;
}

export abstract class WriteRepository<Agg extends BaseAggregate<any>> {
  abstract create(entity: Agg, options?: WriteOptions): Promise<void>;
  abstract update(entity: Agg, options?: WriteOptions): Promise<void>;
  abstract delete(entity: Agg, options?: WriteOptions): Promise<void>;
}

export abstract class WriteAndRead<Agg extends BaseAggregate<any>> {
  abstract find(criteria: PaginationCriteria): Promise<Pagination<Agg>>;
  abstract findById(id: string): Promise<Agg | null>;
  abstract create(entity: Agg, options?: WriteOptions): Promise<void>;
  abstract update(entity: Agg, options?: WriteOptions): Promise<void>;
  abstract delete(entity: Agg, options?: WriteOptions): Promise<void>;
}
