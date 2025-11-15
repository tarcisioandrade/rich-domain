import { EntityProps } from '../interface/types';
import { type Entity } from './entity';

export const mutationArrayMethods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'slice',
  'fill',
  'copyWithin',
  'splice',
  'reverse',
];

export const proxyHandler = <Props extends EntityProps>(
  self: Entity<Props>,
  keyProp: string[] = [],
): ProxyHandler<Props> => ({
  get: (target, prop: string, receiver) => {
    if (Array.isArray((target as any)[prop])) {
      return new Proxy(
        (target as any)[prop],
        proxyHandler(self, [...keyProp, prop]),
      );
    }

    const accessor = Reflect.get(target, prop, receiver);

    if (typeof accessor === 'function' && mutationArrayMethods.includes(prop)) {
      return (...args: unknown[]) => {
        const result = Array.prototype[prop as any].apply(target, args);
        self.history?.addSnapshot({
          props: (self as any).props,
          trace: {
            instanceId: self.id.value,
            instanceKey: self.constructor.name,
            fieldKey: keyProp?.join('.'),
            updatedAt: new Date(),
            update: keyProp?.join('.'),
            action: prop,
          },
        });
        return result;
      };
    }

    return accessor;
  },

  set: (target, prop, value, receiver) => {
    const oldValue = Reflect.get(target, prop, receiver);
    Reflect.set(target, prop, value, receiver);
    if (!Array.isArray(receiver)) {
      self?.history?.addSnapshot({
        props: (self as any)['props'],
        trace: {
          instanceId: self.id.value,
          instanceKey: self.constructor.name,
          fieldKey: prop?.toString?.() ?? '',

          updatedAt: new Date(),
          update: prop?.toString?.(),
          from: oldValue,
          to: value,
        },
      });
    }
    /**
       *      else  { 
        let prefix = keyProp?.join?.(".");
        if (prefix) prefix += ".";
        console.log('position', prop)
        self?.history?.addSnapshot({
          props: self['props'],
          trace: {
            updatedAt: new Date(),
            update: prefix + prop?.toString(),
            from: oldValue,
            to: value,
            position: Number(prop)
          }
        });

      }
       */

    return true;
  },
});
