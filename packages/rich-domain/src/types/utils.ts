import { Id } from "../id";

export type DeepJsonResult<T> = {
  [K in keyof T]: T[K] extends Id
    ? string
    : T[K] extends { toJson(): infer U }
    ? U
    : T[K] extends Array<infer U>
    ? U extends { toJson(): infer V }
      ? V[]
      : U extends Id
      ? string[]
      : U[]
    : T[K];
};

export type Primitive = string | number | boolean | Date | null | undefined;
export type UnwrapArray<T> = T extends Array<infer U> ? U : never;
export type IsArray<T> = T extends Array<any> ? true : false;
export type NonUndefined<T> = T extends undefined ? never : T;
