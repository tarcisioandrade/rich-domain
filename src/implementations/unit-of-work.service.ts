import { Transaction } from '../core/application/repository';

export abstract class UnitOfWorkService {
  abstract startTransaction<T>(callback: Transaction<T>): Promise<T>;
  abstract getContext(): any;
  abstract allowTransaction(constructorz: any): void;
}
