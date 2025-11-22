export interface StandardSchemaIssue {
  message: string;
  path?: ReadonlyArray<unknown>;
}

export interface StandardSchemaResult<T> {
  value?: T;
  issues?: ReadonlyArray<StandardSchemaIssue>;
}

export interface StandardSchemaProps<T> {
  validate: (
    value: unknown
  ) => StandardSchemaResult<T> | Promise<StandardSchemaResult<T>>;
}

export interface StandardSchema<T = unknown> {
  "~standard": StandardSchemaProps<T>;
}