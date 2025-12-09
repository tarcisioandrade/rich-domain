import type { Aggregate } from "../entity.js";
import type { Criteria } from "../criteria.js";
import { PaginatedResult } from "../paginated-result.js";
import { Mapper } from "../mapper.js";

export abstract class ReadRepository<Agg extends Aggregate<any>> {
  abstract find(criteria?: Criteria<Agg>): Promise<PaginatedResult<Agg>>;
  abstract findById(id: string): Promise<Agg | null>;
  abstract count(criteria?: Criteria<Agg>): Promise<number>;
  abstract exists(id: string): Promise<boolean>;
}

export abstract class WriteRepository<Agg extends Aggregate<any>> {
  abstract save(entity: Agg): Promise<void>;
  abstract delete(entity: Agg): Promise<void>;
}

export abstract class WriteAndRead<Agg extends Aggregate<any>> {
  abstract find(criteria?: Criteria<Agg>): Promise<PaginatedResult<Agg>>;
  abstract findById(id: string): Promise<Agg | null>;
  abstract save(entity: Agg): Promise<void>;
  abstract delete(entity: Agg): Promise<void>;
  abstract count(criteria?: Criteria<Agg>): Promise<number>;
  abstract exists(id: string): Promise<boolean>;
}

export abstract class Repository<
  TDomain extends Aggregate<any>
> extends WriteAndRead<TDomain> {
  protected abstract readonly toDomainMapper: Mapper<unknown, TDomain>;
  protected abstract readonly toPersistenceMapper: Mapper<TDomain, unknown>;
  protected abstract get model(): any;
}
