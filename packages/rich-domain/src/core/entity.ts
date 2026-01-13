import { BaseEntity } from "./base-entity.js";
import { BaseAggregate } from "./base-aggregate.js";
import { BaseProps } from "../types/index.js";

export class Entity<
  T extends BaseProps,
  TOptionalInput extends keyof T = never
> extends BaseEntity<T, TOptionalInput> {}

export class Aggregate<
  T extends BaseProps,
  TOptionalInput extends keyof T = never
> extends BaseAggregate<T, TOptionalInput> {}
