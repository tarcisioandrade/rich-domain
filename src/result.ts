// ============================================================================
// Result Pattern - Functional Error Handling
// ============================================================================

export type Result<T, E = Error> = Success<T> | Failure<E>;

export class Success<T> {
  readonly isSuccess: true = true;
  readonly isFailure: false = false;

  constructor(public readonly value: T) {}

  map<U>(fn: (value: T) => U): Result<U, never> {
    return Result.ok(fn(this.value));
  }

  flatMap<U, E>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  getOrElse(_defaultValue: T): T {
    return this.value;
  }

  getOrThrow(): T {
    return this.value;
  }
}

export class Failure<E> {
  readonly isSuccess: false = false;
  readonly isFailure: true = true;

  constructor(public readonly error: E) {}

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return (this as unknown) as Result<U, E>;
  }

  flatMap<U, E2>(_fn: (value: never) => Result<U, E2>): Result<U, E | E2> {
    return (this as unknown) as Result<U, E | E2>;
  }

  getOrElse<T>(defaultValue: T): T {
    return defaultValue;
  }

  getOrThrow(): never {
    throw this.error;
  }
}

export const Result = {
  ok: <T>(value: T): Success<T> => new Success(value),
  fail: <E>(error: E): Failure<E> => new Failure(error),

  fromTry: <T>(fn: () => T): Result<T, Error> => {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  },

  combine: <T>(results: Result<T, Error>[]): Result<T[], Error> => {
    const values: T[] = [];
    for (const result of results) {
      if (result.isFailure) {
        return (result as unknown) as Result<T[], Error>;
      }
      values.push(result.value);
    }
    return Result.ok(values);
  },
};
