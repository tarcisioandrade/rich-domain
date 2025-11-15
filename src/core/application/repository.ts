import { Aggregate as BaseAggregate } from '../domain/aggregate';
import { WriteAndRead } from '../domain/repository';
import { BaseAdapter } from './adapter';

export type PersistenceContext = unknown;
export type Transaction<T> = (context: PersistenceContext) => Promise<T>;

export abstract class BaseUnitOfWork {
  abstract startTransaction<T>(callback: Transaction<T>): Promise<T>;
  abstract commit?(): Promise<void>;
  abstract rollback?(): Promise<void>;
}

export abstract class RepositoryImplementation<
  Agg extends BaseAggregate<any>,
> extends WriteAndRead<Agg> {
  protected abstract readonly adapterToDomain: BaseAdapter<unknown, Agg>;
  protected abstract readonly adapterToPersistence: BaseAdapter<Agg, unknown>;
  abstract get model(): any;
}
