import { Entity } from '../../domain';
import { ValueObject } from '../../domain';
import { Aggregate } from '../../domain';
export type Primitives = string | number | boolean;

export interface EntityProps {
  id: IdImplementation;
  createdAt?: Date | null | undefined;
  updatedAt?: Date | null | undefined;
}

type Omit_<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type MakeOptional<T, K extends keyof T> = Omit_<T, K> & Partial<Pick<T, K>>;
export type EntityInput<
  Props extends EntityProps,
  T extends keyof Props,
> = MakeOptional<Props, T>;

export interface IdImplementation {
  value: string;
  longValue: string;
  isNew(): boolean;
  setAsNew(): void;
  setAsOld(): void;
  isEqual(id: IdImplementation): boolean;
  cloneAsNew(): IdImplementation;
  clone(): IdImplementation;
}

export type DomainEventReplaceOptions =
  | 'REPLACE_DUPLICATED'
  | 'UPDATE'
  | 'KEEP';

export interface IDomainEvent<T> {
  aggregate: T;
  createdAt: Date;
  eventName: string;
}

export type WithoutEntityProps<T> = Omit<T, keyof EntityProps>;
export interface EntityMapperPayload {
  id: string;
  createdAt?: Date | null | undefined;
  updatedAt?: Date | null | undefined;
}

export interface EventPublisher<AggregateType> {
  publish(event: IDomainEvent<AggregateType>): any;
}

export type EntityCompareResult = {
  different: string[];
  missing_from_first: string[];
  missing_from_second: string[];
};

type SerializerEntityNullableReturnType<ThisEntity extends null | Entity<any>> =
  ThisEntity extends Entity<any> ? ReturnType<ThisEntity['getRawProps']> : null;
type SerializerEntityReturnType<ThisEntity extends Entity<any>> = ReturnType<
  ThisEntity['getRawProps']
>;

type ExtendsValueObject<T> = T extends ValueObject<infer V> ? V : never;
type IsNullable<T> = null extends T ? true : false;

export type AutoMapperSerializer<Props> = Props extends Primitives
  ? Props
  : {
      [key in keyof Props]: Props[key] extends ValueObject<any>
        ? AutoMapperSerializer<Props[key]['value']>
        : ExtendsValueObject<Props[key]> extends never
          ? Props[key] extends Entity<any>
            ? AutoMapperSerializer<SerializerEntityReturnType<Props[key]>> &
                EntityMapperPayload
            : Props[key] extends null | Entity<any>
              ? AutoMapperSerializer<
                  SerializerEntityNullableReturnType<Props[key]>
                > &
                  EntityMapperPayload
              : Props[key] extends Array<Entity<any>>
                ? Array<
                    AutoMapperSerializer<
                      ReturnType<Props[key][number]['getRawProps']>
                    > &
                      EntityMapperPayload
                  >
                : Props[key] extends Array<ValueObject<any>>
                  ? Array<AutoMapperSerializer<Props[key][number]['value']>>
                  : Props[key] extends Array<ValueObject<Primitives>>
                    ? Array<AutoMapperSerializer<Props[key][number]['value']>>
                    : Props[key] extends Array<Primitives>
                      ? Array<Props[key][number]>
                      : key extends 'id'
                        ? string
                        : key extends 'createdAt' | 'updatedAt'
                          ? any
                          : Props[key] extends Date
                            ? Props[key]
                            : Props[key] extends object
                              ? Props[key] extends infer O
                                ? { [K in keyof O]: AutoMapperSerializer<O[K]> }
                                : never
                              : Props[key]
          : IsNullable<Props[key]> extends true
            ? AutoMapperSerializer<ExtendsValueObject<Props[key]>> | null
            : AutoMapperSerializer<ExtendsValueObject<Props[key]>>;
    };
export type SnapshotTrace = {
  updatedAt: Date;
  instanceId?: string;
  instanceKey: string;
  fieldKey: string;
  update: string;
  position?: number;
  action?: string;
  from?: any;
  to?: any;
};

export type SnapshotInput<T> = {
  props: T;
  trace: SnapshotTrace;
};
export type ISnapshotAggregate = {
  aggregateName: string;
  actionName: string;
};
export interface ISnapshot<T> {
  readonly props: T;
  trace: SnapshotTrace;
  fromDeepWatch: boolean;
  deepWatchPath: string | null;
  get timestamp(): Date;
  hasChange(key: string): boolean;
}

export type SnapshotCallbacks<T> = {
  onAddedSnapshot?: (snapshot: ISnapshot<T>) => void;
};

export type WithDate<T> = T & {
  createdAt: Date;
  updatedAt?: Date;
};

export type SelfHistoryProp<Props, OmitProps> = {
  onChange: Omit<Props, keyof OmitProps>;
};

export type HistorySubscribe<
  Props,
  GenericEntity = Props,
  KeysToExtract extends keyof Props = ExtractEntityAndValueObjectKeys<Props>,
  OmitProps = Pick<Props, KeysToExtract>,
  ResolvedProps = OmitProps | SelfHistoryProp<Props, OmitProps>,
> = {
  [key in keyof ResolvedProps]?: key extends 'onChange'
    ? HistorySubscribeCallback<GenericEntity>
    : HistorySubscribe<
        ResolvedProps[key] extends Entity<any>
          ? ReturnType<ResolvedProps[key]['getRawProps']>
          : ResolvedProps[key] extends ValueObject<any>
            ? ResolvedProps[key]['props']
            : ResolvedProps[key] extends Array<Entity<any>>
              ? ReturnType<ResolvedProps[key][number]['getRawProps']>
              : ResolvedProps[key] extends Array<ValueObject<any>>
                ? ResolvedProps[key][number]['props']
                : never,
        ResolvedProps[key] extends DomainEntityAggregateOrValueObject
          ? ResolvedProps[key]
          : never
      >;
};

export type HistorySubscribeCallback<TKey> = (
  resolvedValues: TKey extends Array<any>
    ? {
        toCreate: TKey;
        toUpdate: TKey;
        toDelete: TKey;
        entity: TKey;
      }
    : { entity: TKey },
  trace: SnapshotTrace[],
) => void;

type ExtractKeysOfValueType<T, K> = {
  [I in keyof T]: T[I] extends K ? I : T[I] extends Readonly<K> ? I : never;
}[keyof T];

type DomainEntityAggregateOrValueObject =
  | Entity<any>
  | Aggregate<any>
  | Array<any>
  | Array<Entity<any>>
  | Array<Aggregate<any>>
  | Omit<ValueObject<NotPrimitive>, 'props' | 'getRawProps' | 'toPrimitives'>
  | Array<
      Omit<ValueObject<NotPrimitive>, 'props' | 'getRawProps' | 'toPrimitives'>
    >
  | (null | Entity<any>)
  | (null | Aggregate<any>)
  | (null | Array<any>)
  | (null | Array<Entity<any>>)
  | (null | Array<Aggregate<any>>)
  | (null | Array<
      Omit<ValueObject<NotPrimitive>, 'props' | 'getRawProps' | 'toPrimitives'>
    >)
  | (null | Array<Array<any>>)
  | (null | Array<Array<Entity<any>>>)
  | (null | Array<Array<Aggregate<any>>>)
  | (null | Array<
      Array<
        Omit<
          ValueObject<NotPrimitive>,
          'props' | 'getRawProps' | 'toPrimitives'
        >
      >
    >);

export type ExtractEntityAndValueObjectKeys<T> = ExtractKeysOfValueType<
  T,
  DomainEntityAggregateOrValueObject
>;

export type NotPrimitive = object | Array<any>;

export interface EntityConfig extends BaseAggregateConfig {
  isAggregate?: boolean;
}
export interface BaseAggregateConfig {
  /**
   * Prevent the history tracker to be created.
   * That means that the entity will not have the history of changes.
   * @default false
   */
  preventHistoryTracker?: boolean;
  /**
   * It's useful only on development mode.
   * Every time that entity is mutated, @type {ISnapshot} will deepClone the props state to ensure
   * that you have the time based props before it changed.
   * @default false
   */
  onSnapshotAddedDeepClonePropsState?: boolean;
}
