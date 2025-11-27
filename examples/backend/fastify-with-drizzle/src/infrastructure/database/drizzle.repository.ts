import { Aggregate, Mapper, Repository } from "@woltz/rich-domain";
import { Database } from "./connection";

export abstract class DrizzleRepository<
  TDomain extends Aggregate<any>,
  TPersistence
> extends Repository<TDomain> {
  constructor(
    protected readonly mapperToPersistence: Mapper<TDomain, void>,
    protected readonly mapperToDomain: Mapper<TPersistence, TDomain>,
    private readonly db: Database
  ) {
    super();
  }

  protected abstract includes: unknown;

  get context() {
    return this.db;
  }

  async count(criteria?: Criteria<TDomain>): Promise<number> {
    
  }
}
