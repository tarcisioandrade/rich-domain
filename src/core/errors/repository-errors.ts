import { RepositoryError } from './';

export class WriteRepositoryError extends RepositoryError {}
export class ReadRepositoryError extends RepositoryError {}

export type TypeReadRepositoryError = InvalidInput;

export type AdapterRepositoryError =
  | AdapterToPersistenceError
  | AdapterToDomainError;

export type RepositoryQueryError = InvalidInput | AdapterToDomainError;

export type RepositoryPersistenceError =
  | DuplicateEntry
  | ForeignConstraintKey
  | NullConstraintViolation
  | LengthConstraintViolation
  | NumericConstraintViolation
  | UniqueConstraintViolation
  | UnknownConstraintViolation
  | PrismaError
  | AdapterToPersistenceError;

export class InvalidInput extends WriteRepositoryError {
  constructor(target: any, expected: any) {
    super(`Entrada inválida: ${target} deveria ser ${expected}`);
  }
}

export class ForeignConstraintKey extends WriteRepositoryError {
  constructor(table: any, constraint: any) {
    super(`Falha na FK constraint: ${table}.${constraint}`);
  }
}

export class DuplicateEntry extends WriteRepositoryError {
  constructor(target: any) {
    super(`Valor duplicado: ${target} já está registrado.`);
  }
}

export class NullConstraintViolation extends WriteRepositoryError {
  constructor(target: any) {
    super(`Valor não pode ser nulo: ${target}. ('Null constraint violation').`);
  }
}

export class LengthConstraintViolation extends WriteRepositoryError {
  constructor(target: any, max: any) {
    super(
      `Tamanho excedido. ${target} deve ter no máximo ${max}. ('Length constraint violation').`,
    );
  }
}

export class NumericConstraintViolation extends WriteRepositoryError {
  constructor(target: any, min: any, max: any) {
    super(
      `Falha na validação numerica. ${target} deve está entre ${min} e ${max}. ('Numeric constraint violation').`,
    );
  }
}

export class UniqueConstraintViolation extends WriteRepositoryError {
  constructor(target: any) {
    super(
      `Valor duplicado: ${target} deve ser único. ('Unique constraint violation').`,
    );
  }
}

export class UnknownConstraintViolation extends WriteRepositoryError {
  constructor(err: any) {
    super(`Erro de constraint desconhecido: ${err}`);
  }
}

export class PrismaError extends WriteRepositoryError {
  constructor(err: any) {
    super(`Prisma error: ${err?.message}`);
  }
}

export class UnknownError extends WriteRepositoryError {
  constructor(err: any) {
    super(`Unknown error: ${err?.message}`);
  }
}

export class AdapterToPersistenceError extends WriteRepositoryError {
  constructor(err: Error) {
    super(`Repository adapter to persistence error: ${err?.message}`, err);
  }
}

export class AdapterToDomainError extends WriteRepositoryError {
  constructor(err: Error) {
    super(`Repository adapter to domain error: ${err?.message}`, err);
  }
}
