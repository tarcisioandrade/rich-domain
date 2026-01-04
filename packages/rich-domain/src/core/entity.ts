import { BaseEntity } from "./base-entity.js";
import { BaseProps } from "../types/index.js";

export class Entity<T extends BaseProps> extends BaseEntity<T> {}
export class Aggregate<T extends BaseProps> extends BaseEntity<T> {}
