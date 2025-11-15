import { Entity } from '../domain/entity';
import { ValueObject } from '../domain/value-object';
import { AutoMapperSerializer } from '../interface/types';
import { PaginationCriteria } from './pagination-criteria';
import {
  Filtering,
  PaginationQuery,
  PaginationResult,
} from './pagination-types';

type SerializedPagination<Aggregate> = {
  query: PaginationQuery;
  result: Aggregate[];
};

type JSONPaginationResult<Aggregate> = SerializedPagination<
  Aggregate extends Entity<any>
    ? AutoMapperSerializer<ReturnType<Aggregate['getRawProps']>>
    : Aggregate extends ValueObject<any>
      ? AutoMapperSerializer<Aggregate['value']>
      : Aggregate
>;
export class Pagination<Aggregate> {
  public readonly query: PaginationQuery;
  public result: Aggregate[];

  constructor(
    criteria: PaginationCriteria,
    paginationResult: PaginationResult<Aggregate>,
  ) {
    this.result = paginationResult.result;
    this.query = {
      timestamp: Date.now(),
      currentPage: Math.floor(criteria.offset / criteria.limit) + 1,
      totalPages: Math.ceil(paginationResult.total / criteria.limit),
      totalResults: paginationResult.total,
      config: {
        search: criteria.search,
        offset: criteria.offset,
        limit: criteria.limit,
        filter: criteria?.filter as Filtering,
        businessFilter: criteria?.businessFilter as Filtering,
        orderBy: criteria?.orderBy,
      },
    };
  }

  public toJSON<T = JSONPaginationResult<Aggregate>>(
    transformer?: (
      aggregate: JSONPaginationResult<Aggregate>['result'][number],
    ) => T,
  ): T extends JSONPaginationResult<Aggregate>
    ? JSONPaginationResult<Aggregate>
    : JSONPaginationResult<T> {
    if (typeof (this.result?.[0] as any)?.toJSON === 'function') {
      this.result = this.result.map((item: any) => item.toJSON());
    }

    if (typeof (this.result?.[0] as any)?.toPrimitives === 'function') {
      this.result = this.result.map((item: any) => item.toPrimitives());
    }

    if (typeof transformer === 'function') {
      this.result = this.result.map(
        transformer as any,
      ) as unknown as Aggregate[];
    }

    return this as unknown as T extends JSONPaginationResult<Aggregate>
      ? JSONPaginationResult<Aggregate>
      : JSONPaginationResult<T>;
  }

  // public toJSON<T>(
  //   transformer?: (aggregate: JSONPaginationResult<Aggregate>) => T,
  // ): JSONPaginationResult<Aggregate> {
  //   if (!(typeof (this.result?.[0] as any)?.toJSON === 'function')) {
  //     return this as unknown as JSONPaginationResult<Aggregate>;
  //   }

  //   this.result = this.result.map((item: any) => item.toJSON());

  //   if (typeof transformer === 'function') {
  //     this.result = this.result.map(transformer as any) as unknown[] as Aggregate[];
  //   }

  //   return this as unknown as JSONPaginationResult<Aggregate>;
  // }
}
