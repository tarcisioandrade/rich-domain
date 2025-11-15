import { DomainError } from '../errors';

export const RevalidateError = (
  errorMessage: string,
  value: any,
  expected: string,
  field?: string,
  metadata?: any,
) => {
  let received = '';

  if (typeof value === 'object') {
    if (value?.isEntity) {
      received = value?.constructor?.name;
    } else if (value?.isValueObject) {
      received = value?.constructor?.name;
    } else if (Array.isArray(value)) {
      const first = value?.[0];
      if (first?.isEntity) {
        received = `ArrayOf<${first?.constructor?.name}>`;
      }

      if (first?.isValueObject) {
        received = `ArrayOf<${first?.constructor?.name}>`;
      }
    } else {
      received = `Object.${value?.constructor?.name}`;
    }
  } else {
    received = typeof value;
  }

  let expectedType: string = expected;

  if (expected === 'Optional') {
    expectedType = 'Optional<...>';
  }
  if (expected === 'ArrayOf') {
    expectedType = 'ArrayOf<...>';
  }
  return new DomainError(`Erro 422. ${errorMessage}`, {
    property: `${field}`,
    value,
    received,
    expected: expectedType,
    metadata,
  });
};
