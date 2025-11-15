export type ResultError = { message: string };
export type Either<Error extends ResultError, Result> =
  | Fail<Error, Result>
  | Ok<Error, Result>;
export type PromiseEither<Error extends ResultError, Result> = Promise<
  Either<Error, Result>
>;

export class Fail<Error extends ResultError, Result> {
  readonly _value: Error;

  constructor(value: Error) {
    this._value = value;
  }

  public getValue(): Error {
    return this._value;
  }
  isFail(): this is Fail<Error, Result> {
    return true;
  }

  isSuccess(): this is Ok<Error, Result> {
    return false;
  }
}

export class Ok<Error extends ResultError, Result> {
  private readonly _value: Result;

  constructor(value: Result) {
    this._value = value;
  }

  public getValue(): Result {
    return this._value;
  }
  isFail(): this is Fail<Error, Result> {
    return false;
  }

  isSuccess(): this is Ok<Error, Result> {
    return true;
  }
}

export const fail = <Error extends ResultError, Result>(
  l: Error,
): Either<Error, Result> => {
  return new Fail(l);
};

export const ok = <Error extends ResultError, Result>(
  a?: Result,
): Either<Error, Result> => {
  return new Ok<Error, Result>(a as Result);
};

export const combine = (results: Either<any, any>[]): Either<any, any[]> => {
  const values: any[] = [];

  for (const result of results) {
    if (result.isFail()) {
      return fail(result.getValue());
    }

    values.push(result.getValue());
  }

  return ok(values);
};
