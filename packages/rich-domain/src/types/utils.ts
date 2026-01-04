import { Id, ValueObject } from "../core/index";

type JsonPrimitive = string | number | boolean | null;

export type DeepJsonResult<T> = T extends Id
  ? string
  : T extends ValueObject<infer U>
  ? U
  : T extends Date
  ? string
  : T extends Array<infer U>
  ? DeepJsonResult<U>[]
  : T extends { toJSON(): infer R }
  ? DeepJsonResult<R>
  : T extends object
  ? { [K in keyof T]: DeepJsonResult<T[K]> }
  : T extends JsonPrimitive
  ? T
  : never;

export type Primitive = string | number | boolean | Date | null | undefined;
export type UnwrapArray<T> = T extends Array<infer U> ? U : never;
export type IsArray<T> = T extends Array<any> ? true : false;
export type NonUndefined<T> = T extends undefined ? never : T;
