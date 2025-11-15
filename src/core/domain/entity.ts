import lodash from 'lodash';
import { ZodSchema } from 'zod';
import { deepFreeze } from '../../utils/deep-freeze';
import { lodashCompare } from '../../utils/lodash-compare';
import { DomainError } from '../errors';
import {
  AutoMapperSerializer,
  EntityCompareResult,
  EntityConfig,
  EntityProps,
  HistorySubscribe,
  ISnapshot,
  WithDate,
  WithoutEntityProps,
} from '../interface/types';
import { AutoMapperEntity } from './auto-mapper-entity';
import { isEqualWithoutCompareSpecifiedKeys } from './entity-keys-to-exclude-on-compare';
import { EntityMetaHistory } from './history';
import { EntityHook } from './hooks';
import { Id } from './ids';
import { proxyHandler } from './proxy';
import { RevalidateError } from './revalidate-error';

export abstract class Entity<
  Props extends EntityProps,
  Input extends Partial<Props> = Partial<Props>,
> {
  protected static autoMapper = new AutoMapperEntity();
  protected static hooks: EntityHook<any, any>;

  public isEntity = true;

  private _id: Id | null = null;
  private _createdAt: Date | null = null;
  private _updatedAt: Date | null = null;
  protected props: Props;
  protected metaHistory: EntityMetaHistory<Props> | null = null;
  protected rulesIsLocked = false;

  constructor(input: Props, options?: EntityConfig);
  constructor(input: WithDate<Props>, options?: EntityConfig);
  constructor(input: Props | WithDate<Props>, options: EntityConfig = {}) {
    const instance = this.constructor as typeof Entity<Props>;

    if (!input || typeof input !== 'object') {
      throw new DomainError(
        `Entity input must be an object reference to "${instance?.name}Props"`,
      );
    }

    if (input instanceof Entity) {
      throw new DomainError('Entity instance cannot be passed as argument');
    }

    this.props = this.transformBeforeCreate(input);
    this.generateOrAssignId(this.props);
    this.assignAndRemoveTimestampSignatureFromProps(this.props);
    this.revalidate();
    this.ensureBusinessRules();

    if (!options?.isAggregate) {
      this.onEntityCreate();
    }

    if (!options?.preventHistoryTracker) {
      this.props = this.generateProxyProps();

      const onAddedSnapshot = (snapshot: ISnapshot<Props>) => {
        const field = snapshot.trace.update;
        this.revalidate(field as keyof WithoutEntityProps<Props>);
        if (!this.rulesIsLocked) {
          this.rulesIsLocked = true;
          this.ensureBusinessRules();
          this.rulesIsLocked = false;
        }

        if (typeof instance?.hooks?.onChange === 'function') {
          instance.hooks.onChange(this, snapshot);
          if (options.isAggregate)
            this.history.deepWatch(this, instance.hooks.onChange);
        }
      };

      this.metaHistory = new EntityMetaHistory<Props>(this.props, {
        onAddedSnapshot,
      });

      if (
        options.isAggregate &&
        typeof instance?.hooks?.onChange === 'function'
      ) {
        this.history.deepWatch(this, instance.hooks.onChange);
      }
    }
  }

  public subscribe(props: HistorySubscribe<Props, this>) {
    if (!this.history) {
      throw new DomainError('History is not enabled for this entity');
    }
    return this.history.subscribe(this, props as any);
  }

  // Dispatch Entity Hook Validation
  public revalidate(fieldToRevalidate?: keyof WithoutEntityProps<Props>) {
    const instance = this.constructor as typeof Entity<Props>;
    const typeValidation = instance.hooks?.typeValidation;
    if (!typeValidation) return;

    if (typeValidation instanceof ZodSchema) {
      const result = typeValidation.safeParse(this.props);
      if (!result.success) {
        throw new DomainError('⭐ Ocorreu um erro de validação', result.error);
      }

      return;
    }

    if (fieldToRevalidate) {
      const value = this.props[fieldToRevalidate];
      const validation = typeValidation[fieldToRevalidate];
      const errorMessage = validation?.(value);
      if (errorMessage) {
        const fieldMessage = `. field=${fieldToRevalidate?.toString()} instance=${instance?.name}`;
        const expected = typeValidation[fieldToRevalidate]?.name;
        const field = fieldToRevalidate.toString();
        throw RevalidateError(
          errorMessage + fieldMessage,
          value,
          expected,
          field,
        );
      }
    } else {
      for (const [field, validation] of Object.entries(typeValidation)) {
        const value = this.props[field as keyof Props];
        const errorMessage = validation(value);
        if (errorMessage) {
          const fieldMessage = `. field=${field?.toString()} instance=${instance?.name}`;
          throw RevalidateError(
            errorMessage + fieldMessage,
            value,
            validation?.name,
            field,
          );
        }
      }
    }
  }

  /**
    @deprecated
    This method will throw an error if called.
   */
  public getRawProps(): Props {
    throw new DomainError('Method .getRawProps() is not allowed.');
  }

  public ensureBusinessRules() {
    const instance = this.constructor as typeof Entity<Props>;
    instance?.hooks?.rules?.(this);
  }

  get history() {
    if (!this.metaHistory) {
      throw new DomainError('History is not enabled for this entity');
    }
    return this.metaHistory;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  get id(): Id {
    if (!this._id) {
      throw new DomainError('Entity id is not defined');
    }

    return this._id;
  }

  public clone() {
    const instance = Reflect.getPrototypeOf(this);
    if (!instance) {
      throw new DomainError('Entity instance is not defined');
    }
    const args = [this.props];
    const entity = Reflect.construct(instance.constructor, args);
    return entity;
  }

  public isNew(): boolean {
    return this.id.isNew();
  }

  public toPrimitives(): Readonly<AutoMapperSerializer<Props>> {
    const result = Entity.autoMapper.entityToObj<Props>(this);
    const frozen = deepFreeze(result);
    return frozen;
  }

  public toJSON(): Readonly<AutoMapperSerializer<Props>> {
    return this.toPrimitives();
  }

  public hashCode(): Id {
    const name = Reflect.getPrototypeOf(this);
    return new Id(`entity@${name?.constructor?.name}:${this.id.value}`);
  }

  public isEqual(other?: Entity<Props>): boolean {
    if (!other) return false;
    if (!(other instanceof Entity)) return false;
    if (this === other) return true;

    const thisProps = this['props'];
    const otherProps = other['props'];
    const currentProps = lodash.cloneDeep(thisProps);
    const providedProps = lodash.cloneDeep(otherProps);
    const equalId = this.id.isEqual(other.id as Id);
    return (
      equalId &&
      lodash.isEqualWith(
        currentProps,
        providedProps,
        isEqualWithoutCompareSpecifiedKeys,
      )
    );
  }

  public compare(other?: Entity<Props>): EntityCompareResult {
    return lodashCompare(this.props, other?.props);
  }

  private transformBeforeCreate(props: Input | Props): Props {
    const instance = this.constructor as typeof Entity<Props>;

    if (!instance?.hooks?.defaultValues) {
      return props as unknown as Props;
    }

    if (instance?.hooks?.defaultValues) {
      for (const [key, defaultValue] of Object.entries(
        instance.hooks.defaultValues,
      )) {
        if (props[key as keyof Props] === undefined) {
          if (typeof defaultValue === 'function')
            props[key as keyof Props] = defaultValue?.(
              props[key as keyof Props],
              props,
            );
          else (props as any)[key as keyof Props] = defaultValue;
        }
      }
    }

    return props as unknown as Props;
  }

  private onEntityCreate() {
    const instance = this.constructor as typeof Entity<Props>;
    instance?.hooks?.onCreate?.(this);
  }

  private generateProxyProps() {
    return new Proxy<Props>(this.props, proxyHandler(this));
  }

  private generateOrAssignId(props: Props) {
    if (props.id instanceof Id) {
      this._id = props.id;
    } else {
      const id = new Id(typeof props.id === 'string' ? props.id : undefined);
      this._id = id;
      props.id = id;
    }
  }

  private assignAndRemoveTimestampSignatureFromProps(props: Props) {
    if (props?.createdAt) {
      this._createdAt = props.createdAt;
    } else {
      if (props.id.isNew()) {
        this._createdAt = new Date();
      }
    }
    if (props?.updatedAt) {
      this._updatedAt = props.updatedAt;
    }

    delete props?.createdAt;
    delete props?.updatedAt;
  }
}

export class DummyEntity extends Entity<any> {}
