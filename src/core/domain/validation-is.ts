import { isEmail } from '../../utils/is-email';
import { isUUID } from '../../utils/is-uuid';
import { isValidDate } from '../../utils/is-valid-date';

const LengthLog = (min?: number, max?: number) => {
  if (typeof min !== 'number' && typeof max !== 'number') {
    return '';
  }
  if (typeof min === 'number' && typeof max === 'number') {
    return `Intervalo permitido: ${min} - ${max}.`;
  }

  if (typeof min === 'number') {
    return `Valor mínimo permitido: ${min}.`;
  }

  if (typeof max === 'number') {
    return `Valor máximo permitido: ${max}.`;
  }
};

const StringRangeValidator = (
  min = 0,
  max: number = Number.MAX_SAFE_INTEGER
) => {
  return function StringRange(value: string) {
    if (value.length < min || value.length > max) {
      return `Esperava receber um valor de texto válido. ${LengthLog(
        min,
        max
      )}`;
    }
  };
};
const NumberRangeValidator = (
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER
) => {
  return function NumberRange(value: number) {
    if (value < min || value > max) {
      return `Valor fora do intervalo permitido. Intervalo permitido: ${min} - ${max}.`;
    }
  };
};

export const is = {
  nullable(callback: (args: any) => string | undefined) {
    return function Nullable(value: any) {
      if (value === null || value === undefined) {
        return;
      }
      return callback(value);
    };
  },
  arrayOf(callback: (args: any) => string | undefined) {
    return function ArrayOf(value: any[]) {
      if (!Array.isArray(value)) {
        return 'Tipo de valor inválido. Esperava receber uma lista';
      }
      const result = value.findIndex(v => callback(v));
      if (result > -1) {
        return callback(value[result]);
      }
    };
  },

  in(values: any[]) {
    return function In(value: any) {
      if (!values.includes(value)) {
        return `Valor inválido. Disponível: ${values.join(', ')}`;
      }
    };
  },

  defined() {
    return function AnyType(value: any) {
      if (value === null || value === undefined) {
        return 'Tipo de valor inválido. Esperava um valor definido.';
      }
    };
  },

  anyType() {
    return function AnyType(value?: any) {
      value;
      return;
    };
  },

  uuid() {
    return function UUID(value: string) {
      if (typeof value !== 'string' || !isUUID(value)) {
        return 'UUID inválido.';
      }
    };
  },
  string(min?: number, max?: number) {
    return (value: string) => {
      if (typeof value !== 'string') {
        return 'Esperava receber um valor de texto válido.';
      }

      return StringRangeValidator(min, max)(value);
    };
  },

  email() {
    return function Email(value: string) {
      if (typeof value !== 'string' || !isEmail(value)) {
        return 'Email inválido.';
      }
    };
  },

  date() {
    return (value: any) => {
      if (!isValidDate(value)) {
        return 'Esperava receber um valor de data válido.';
      }
    };
  },

  number(min?: number, max?: number) {
    return (value: number) => {
      if (!(typeof value === 'number' && !Number.isNaN(value))) {
        return 'Esperava receber um número válido.';
      }

      return NumberRangeValidator(min, max)(value);
    };
  },

  integer(min?: number, max?: number) {
    return function Integer(value: number) {
      if (!Number.isInteger(value)) {
        return 'Esperava receber um número inteiro.';
      }

      return NumberRangeValidator(min, max)(value);
    };
  },

  boolean() {
    return (value: boolean) => {
      if (typeof value !== 'boolean') {
        return 'Tipo de valor inválido. Esperava receber um valor booleano.';
      }
    };
  },

  enumOf(enumInstance: any) {
    return function EnumOf(value: any) {
      let thisEnum: any = enumInstance;

      if (typeof enumInstance === 'function') {
        thisEnum = enumInstance();
      }

      const enumValues = Object.values(thisEnum);
      if (!enumValues.includes(value)) {
        return `Valor enum inválido. Disponível: ${enumValues.join(', ')}`;
      }
    };
  },

  instanceof(clazz: any) {
    return function InstanceOf(value: any) {
      let thisInstance: any;

      if (typeof clazz === 'function') {
        thisInstance = isClass(clazz) ? clazz : clazz();
      }

      if (!thisInstance) {
        throw new TypeError(
          'O tipo de instância não foi definido. (is.instanceof)'
        );
      }

      if (!(value instanceof thisInstance)) {
        return `Tipo de valor inválido. instance-of reference: ${thisInstance?.name ||
          thisInstance?.constructor?.name}`;
      }
    };
  },
};

function isClass(v: any) {
  return typeof v === 'function' && /^\s*class\s+/.test(v.toString());
}
