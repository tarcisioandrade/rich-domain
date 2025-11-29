import type { Aggregate } from "../entity";
import type { Criteria } from "../criteria";
import { PaginatedResult } from "../paginated-result";
import { Mapper } from "../mapper";

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
  protected abstract readonly mapperToDomain: Mapper<unknown, TDomain>;
  protected abstract readonly mapperToPersistence: Mapper<TDomain, unknown>;
  protected abstract get model(): any;
}
