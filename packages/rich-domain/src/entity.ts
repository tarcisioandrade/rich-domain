import { BaseEntity } from "./base-entity";
import { BaseProps } from "./types";

export class Entity<T extends BaseProps> extends BaseEntity<T> {}
export class Aggregate<T extends BaseProps> extends BaseEntity<T> {}
