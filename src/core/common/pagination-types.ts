export type OrderByEnum = 'asc' | 'desc';
export type Condition =
  | 'equals'
  | 'in'
  | 'notIn'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'not';

export type Value =
  | string
  | number
  | boolean
  | Date
  | null
  | string[]
  | number[];

export type PaginationResult<Aggregate> = {
  result: Aggregate[];
  total: number;
};

export type ConstructorTypeof<T> = new (...args: any[]) => T;

export type PaginationQuery = {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  timestamp: number;
  config: PaginationQueryConfig;
};

export type PaginationQueryConfig = {
  search?: string;
  offset: number;
  filter?: Filtering;
  businessFilter?: Filtering;
  limit: number;
  orderBy?: Ordering;
};

export type Filtering = {
  [key: string]:
    | Omit<Value, 'Date'>
    | {
        [condition in Condition]?: Value;
      };
} & {
  OR?: Filtering | Filtering[];
  AND?: Filtering | Filtering[];
  NOT?: Filtering | Filtering[];
};

export type Ordering = {
  [key: string]: OrderByEnum | Ordering;
};
