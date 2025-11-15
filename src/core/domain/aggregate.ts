import {
  DomainEventReplaceOptions,
  EntityConfig,
  EntityProps,
  EventPublisher,
  IDomainEvent,
  WithDate,
} from '../interface/types';
import { DomainEvent } from './domain-event';
import { Entity } from './entity';
import { EntityHook } from './hooks';
import { Id } from './ids';

const DOMAIN_EVENTS = Symbol('AggregateEvents');
export abstract class Aggregate<
  Props extends EntityProps,
  Input extends Partial<Props> = Partial<Props>,
> extends Entity<Props, Input> {
  public isAggregate = true;
  private [DOMAIN_EVENTS]: IDomainEvent<Props>[] = [];
  protected static hooks: EntityHook<any, any>;

  constructor(input: Props, options?: EntityConfig);
  constructor(input: WithDate<Props>, options?: EntityConfig);
  constructor(input: Props | WithDate<Props>, config?: EntityConfig) {
    super(input, { ...config, isAggregate: true });
    const instance = this.constructor as typeof Entity<any>;
    instance?.hooks?.onCreate?.(this);
  }

  public hashCode() {
    const name = Reflect.getPrototypeOf(this);
    return new Id(`[Aggregate@${name?.constructor?.name}]:${this.props.id}`);
  }

  public addEvent(
    domainEvent: DomainEvent<any, any>,
    replace?: DomainEventReplaceOptions,
  ) {
    const shouldReplace = replace === 'REPLACE_DUPLICATED';

    if (shouldReplace) {
      this.removeEvent(domainEvent.eventName);
    }
    this[DOMAIN_EVENTS].push(domainEvent);
  }

  public clearEvents() {
    this[DOMAIN_EVENTS].splice(0, this[DOMAIN_EVENTS].length);
  }

  public removeEvent(eventName: string) {
    this[DOMAIN_EVENTS] = this[DOMAIN_EVENTS].filter(
      (domainEvent) => domainEvent.eventName !== eventName,
    );
  }

  public getEvents<T = DomainEvent<any>>(eventName?: string): T[] {
    if (eventName) {
      return this[DOMAIN_EVENTS].filter(
        (domainEvent) => domainEvent.eventName === eventName,
      ) as T[];
    }
    return this[DOMAIN_EVENTS] as T[];
  }

  public hasEvent(eventName: string) {
    return this[DOMAIN_EVENTS].some(
      (domainEvent) => domainEvent.eventName === eventName,
    );
  }

  public async dispatch(
    eventName: string,
    eventPublisher: EventPublisher<any>,
  ) {
    const promisesQueue = [] as any[];
    for (const event of this[DOMAIN_EVENTS]) {
      if (
        event.aggregate.id.isEqual(this.id) &&
        event.eventName === eventName
      ) {
        promisesQueue.push(eventPublisher.publish(event));
        this.removeEvent(eventName);
      }
    }
    await Promise.all(promisesQueue);
  }

  public async dispatchAll(eventPublisher: EventPublisher<any>) {
    const promisesQueue = [] as unknown[];
    for (const event of this[DOMAIN_EVENTS]) {
      promisesQueue.push(eventPublisher.publish(event));
    }

    for (const prop in this.props) {
      const currentValue = this.props[prop];
      if (currentValue instanceof Aggregate) {
        promisesQueue.push(currentValue.dispatchAll(eventPublisher));
      }
    }

    await Promise.all(promisesQueue);
    this.clearEvents();
  }
}
