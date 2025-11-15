import Validator from '../../utils/validator';
import { DomainError } from '../errors';
import { AutoMapperSerializer } from '../interface/types';
import { Id } from './ids';
import { DummyValueObject, ValueObject } from './value-object';

export class AutoMapperValueObject {
  public valueObjectToObj<Props>(
    valueObject: ValueObject<Props>,
  ): AutoMapperSerializer<Props> {
    const value = valueObject['props'];

    if (
      !value ||
      typeof value !== 'object' ||
      value === null ||
      value instanceof Date
    ) {
      return value as AutoMapperSerializer<Props>;
    }

    const obj = Object.entries(value).reduce(
      (accumulator, [key, instance]) => {
        if (Array.isArray(instance)) {
          (accumulator as any)[key] = instance.map((item) => {
            if (Validator.isEntity(item) || Validator.isAggregate(item))
              throw new DomainError(
                'Entity cannot be a value object children.',
              );
            if (Validator.isValueObject(item)) return item.toPrimitives();
            else {
              if (Validator.isObject(item)) {
                const newValueObject = new DummyValueObject(item);
                return this.valueObjectToObj(newValueObject);
              } else {
                return item;
              }
            }
          });
        } else {
          if (Validator.isEntity(instance) || Validator.isAggregate(instance))
            throw new DomainError('Entity cannot be a value object children.');
          if (Validator.isValueObject(instance))
            (accumulator as any)[key] = instance.toPrimitives();
          else if (instance instanceof Id) {
            (accumulator as any)[key] = instance.value;
          } else {
            if (Validator.isObject(instance)) {
              const newValueObject = new DummyValueObject(instance);
              (accumulator as any)[key] = this.valueObjectToObj(newValueObject);
            } else {
              (accumulator as any)[key] = instance;
            }
          }
        }

        return accumulator;
      },
      {} as AutoMapperSerializer<Props>,
    );

    return obj;
  }
}
