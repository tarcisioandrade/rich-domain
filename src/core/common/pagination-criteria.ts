import { ZodSchema } from 'zod';
import { ApplicationLevelError } from '../errors';
import { Filtering, Ordering } from './pagination-types';

type PaginationCriteriaInput = {
  offset?: number;
  limit?: number;
  search?: string;
  filter?: Filtering | string;
  orderBy?: Ordering | string;
};

export class PaginationCriteria<F = unknown, O = Ordering> {
  public offset: number;
  public limit: number;
  public search?: string;
  public businessFilter?: F;
  public filter?: F;
  public orderBy?: O;

  constructor(props: PaginationCriteriaInput = {}) {
    this.offset = Number(props?.offset ?? 0);
    this.limit = Number(props?.limit ?? 10);

    if (
      props?.orderBy &&
      props.orderBy !== 'undefined' &&
      props.orderBy !== 'null'
    ) {
      this.orderBy =
        typeof props.orderBy === 'string'
          ? (JSON.parse(props.orderBy) as O)
          : (props.orderBy as O);
    }

    if (props?.filter) {
      this.filter =
        typeof props.filter === 'string'
          ? (JSON.parse(props.filter) as Filtering as F)
          : (props.filter as F);
    }

    if (props?.search) {
      this.offset = 0;
      this.limit = 20;
      this.search = String(props.search);
    }
  }

  public validateFilterWith(zodSchema: ZodSchema) {
    const result = zodSchema.safeParse(this.filter);

    if (!result.success) {
      throw new ApplicationLevelError(result.error.message);
    }
  }

  public setFilter<T extends F>(filter: T) {
    this.filter = filter;
  }

  public setBusinessFilter<T extends F>(filter: T) {
    this.businessFilter = filter;
  }

  public toQuery() {
    const query = new URLSearchParams();
    if (this.offset) query.set('offset', this.offset.toString());
    if (this.limit) query.set('limit', this.limit.toString());
    if (this.search) query.set('search', this.search);
    if (this.filter) query.set('filter', JSON.stringify(this.filter));
    if (this.orderBy) query.set('orderBy', JSON.stringify(this.orderBy));

    return query.toString();
  }
}
