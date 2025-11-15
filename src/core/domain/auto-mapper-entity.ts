import Validator from '../../utils/validator';
import { AutoMapperSerializer, EntityProps } from '../interface/types';
import { DummyEntity, Entity } from './entity';
import { Id } from './ids';

export class AutoMapperEntity {
  entityToObj<Props extends EntityProps>(
    entity: Entity<Props>,
  ): AutoMapperSerializer<Props> {
    const props = (entity as any).props;
    let initialValues = {};

    if (!(entity instanceof DummyEntity)) {
      initialValues = {
        id: entity.id.value,
        createdAt: entity.createdAt ?? null,
        updatedAt: entity.updatedAt ?? null,
      };
    }

    return Object.entries(props).reduce(
      (accumulator, [key, instance]) => {
        if (Array.isArray(instance)) {
          (accumulator as any)[key] = instance.map((item) => {
            if (Validator.isValueObject(item)) return item.toPrimitives();
            else if (Validator.isEntity(item) || Validator.isAggregate(item))
              return item.toPrimitives();
            else if (item instanceof Id) return item.value;
            else {
              if (Validator.isObject(item)) {
                const newEntity = new DummyEntity(item);
                return this.entityToObj(newEntity);
              } else {
                return item;
              }
            }
          });
        } else {
          if (Validator.isValueObject(instance))
            (accumulator as any)[key] = instance.toPrimitives();
          else if (
            Validator.isEntity(instance) ||
            Validator.isAggregate(instance)
          )
            (accumulator as any)[key] = instance.toPrimitives();
          else if (instance instanceof Id)
            (accumulator as any)[key] = instance.value;
          else {
            if (Validator.isObject(instance)) {
              const newEntity = new DummyEntity(instance);
              (accumulator as any)[key] = this.entityToObj(newEntity);
            } else {
              (accumulator as any)[key] = instance;
            }
          }
        }
        return accumulator;
      },
      initialValues as AutoMapperSerializer<Props>,
    );
  }
}
