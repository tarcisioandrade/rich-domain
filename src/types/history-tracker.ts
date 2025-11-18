import { BaseProps } from "..";
import { IsArray, NonUndefined, UnwrapArray } from "./utils";

export interface ChangeEvent<T> {
  previous: T | undefined;
  current: T;
  path: string;
}

export interface ArrayChangeEvent<T> {
  toCreate: T[];
  toUpdate: T[];
  toDelete: T[];
  path: string;
}

export type PropertySubscriber<T> = (event: ChangeEvent<T>) => void;
export type ArraySubscriber<T> = (event: ArrayChangeEvent<T>) => void;

export interface PropertySubscription<T> {
  onChange: PropertySubscriber<T>;
}

export interface ArraySubscription<T> {
  onChange: ArraySubscriber<T>;
}

export type SubscriptionConfig<T extends BaseProps> = {
  [K in keyof T]?: IsArray<NonUndefined<T[K]>> extends true
    ? ArraySubscription<UnwrapArray<NonUndefined<T[K]>>>
    : PropertySubscription<NonUndefined<T[K]>>;
};

export interface ValidationConfig {
  onCreate?: boolean;
  onUpdate?: boolean;
  throwOnError?: boolean;
}

export interface HistoryEntry {
  path: string;
  previousValue: any;
  currentValue: any;
  timestamp: number;
}
