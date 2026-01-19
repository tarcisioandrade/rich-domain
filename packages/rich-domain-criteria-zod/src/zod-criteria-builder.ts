import { z, ZodObject, ZodRawShape } from "zod";
import {
  STRING_OPERATORS,
  NUMBER_OPERATORS,
  BOOLEAN_OPERATORS,
  DATE_OPERATORS,
  ARRAY_OPERATORS,
} from "@woltz/rich-domain";

type FieldKind = "string" | "number" | "date" | "boolean" | "array";

type FieldDef<K extends FieldKind = FieldKind> = {
  kind: K;
  base: z.ZodTypeAny;
  item?: z.ZodTypeAny;
  operators?: readonly string[];
};

const csvArray = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => {
    if (v === undefined || v === null) return v;
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      if (v.trim() === "") return [];
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return v;
  }, z.array(item));

const flagBoolean = () =>
  z.preprocess((v) => {
    if (v === undefined || v === null) return v;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "" || s === "1" || s === "true" || s === "yes" || s === "on")
        return true;
      if (s === "0" || s === "false" || s === "no" || s === "off") return false;
      return true;
    }
    return true;
  }, z.boolean());

const betweenTuple = (coerce: z.ZodTypeAny) =>
  z.preprocess((v) => {
    if (v === undefined || v === null) return v;

    if (Array.isArray(v)) return v.slice(0, 2);
    if (typeof v === "string") {
      const s = v.trim();
      const parts = s.includes("..") ? s.split("..") : s.split(",");
      return parts
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 2);
    }
    return v;
  }, z.tuple([coerce, coerce]));

export const q = {
  string: (opts?: { operators?: readonly string[] }) =>
    ({ kind: "string", base: z.string(), operators: opts?.operators } as const),

  enum: <const T extends readonly [string, ...string[]]>(
    values: T,
    opts?: { operators?: readonly string[] }
  ) =>
    ({
      kind: "string",
      base: z.enum(values),
      operators: opts?.operators,
    } as const),

  number: (opts?: { operators?: readonly string[] }) =>
    ({
      kind: "number",
      base: z.coerce.number(),
      operators: opts?.operators,
    } as const),

  boolean: (opts?: { operators?: readonly string[] }) =>
    ({
      kind: "boolean",
      base: z.coerce.boolean(),
      operators: opts?.operators,
    } as const),

  date: (opts?: { operators?: readonly string[] }) =>
    ({
      kind: "date",
      base: z.coerce.date(),
      operators: opts?.operators,
    } as const),

  array: {
    string: (opts?: { operators?: readonly string[] }) =>
      ({
        kind: "array",
        base: z.string(),
        item: z.string(),
        operators: opts?.operators,
      } as const),

    number: (opts?: { operators?: readonly string[] }) =>
      ({
        kind: "array",
        base: z.coerce.number(),
        item: z.coerce.number(),
        operators: opts?.operators,
      } as const),

    boolean: (opts?: { operators?: readonly string[] }) =>
      ({
        kind: "array",
        base: z.coerce.boolean(),
        item: z.coerce.boolean(),
        operators: opts?.operators,
      } as const),

    date: (opts?: { operators?: readonly string[] }) =>
      ({
        kind: "array",
        base: z.coerce.date(),
        item: z.coerce.date(),
        operators: opts?.operators,
      } as const),

    enum: <const T extends readonly [string, ...string[]]>(
      values: T,
      opts?: { operators?: readonly string[] }
    ) =>
      ({
        kind: "array",
        base: z.enum(values),
        item: z.enum(values),
        operators: opts?.operators,
      } as const),

    of: <T extends z.ZodTypeAny>(
      item: T,
      opts?: { operators?: readonly string[] }
    ) =>
      ({
        kind: "array",
        base: item,
        item,
        operators: opts?.operators,
      } as const),
  },
} satisfies Record<string, unknown>;

const defaultOps: Record<FieldKind, readonly string[]> = {
  string: STRING_OPERATORS,
  number: NUMBER_OPERATORS,
  date: DATE_OPERATORS,
  boolean: BOOLEAN_OPERATORS,
  array: ARRAY_OPERATORS,
} as const;

function schemaForOperator(def: FieldDef, op: string): z.ZodTypeAny {
  switch (def.kind as FieldKind) {
    case "string": {
      const base = z.string();
      if (op === "in" || op === "notIn") return csvArray(base);
      if (op === "isNull" || op === "isNotNull") return flagBoolean();
      return base;
    }
    case "number": {
      const base = z.coerce.number();
      if (op === "in" || op === "notIn") return csvArray(base);
      if (op === "between") return betweenTuple(base);
      if (op === "isNull" || op === "isNotNull") return flagBoolean();
      return base;
    }
    case "date": {
      const base = z.coerce.date();
      if (op === "in" || op === "notIn") return csvArray(base);
      if (op === "between") return betweenTuple(base);
      if (op === "isNull" || op === "isNotNull") return flagBoolean();
      return base;
    }
    case "boolean": {
      const base = z.coerce.boolean();
      if (op === "isNull" || op === "isNotNull") return flagBoolean();
      return base;
    }
    case "array": {
      const item = def.item ?? def.base;
      if (op === "in" || op === "notIn") return csvArray(item);
      if (op === "isNull" || op === "isNotNull") return flagBoolean();
      return csvArray(item);
    }
    default: {
      return z.unknown();
    }
  }
}

type QueryBuilder = typeof q;
type QueryBuilderShape = (
  queryBuilder: QueryBuilder
) => Record<string, FieldDef>;

type InferFieldDefType<T extends FieldDef> = T extends {
  base: infer B extends z.ZodTypeAny;
}
  ? z.infer<B>
  : never;

type InferFilterFields<T extends Record<string, FieldDef>> = {
  [K in keyof T]: InferFieldDefType<T[K]>;
};

function buildFilterSchema<T extends Record<string, FieldDef>>(fields: T) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [field, def] of Object.entries(fields)) {
    const ops = (def.operators ?? defaultOps[def.kind]) as readonly string[];
    for (const op of ops) {
      shape[`${field}:${op}`] = schemaForOperator(def, op).optional();
    }
  }

  return z.object(shape).strict();
}

/**
 * Build a Zod schema for filter query parameters based on field definitions.
 *
 * @example
 * ```ts
 * const filterSchema = defineFilters((q) => ({
 *   name: q.string(),
 *   email: q.string(),
 *   age: q.number(),
 *   isActive: q.boolean(),
 *   createdAt: q.date(),
 * }));
 * ```
 */
export function defineFilters<T extends QueryBuilderShape>(
  shape: T
): z.ZodObject<z.ZodRawShape> & {
  _fieldDefs: ReturnType<T>;
  _fields: InferFilterFields<ReturnType<T>>;
} {
  const fields = shape(q);
  return buildFilterSchema(fields) as any;
}

type OrderEnumValue<F extends string> = `${F}:asc` | `${F}:desc`;
type OrderEnumValues<T extends readonly string[]> = OrderEnumValue<T[number]>;
type CriteriaQueryOptions<O extends readonly string[]> = {
  orderBy?: O;
  pagination?: {
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
  };
};

function parseQueryInput(val: any) {
  const result = { ...val };

  if (result.filters && typeof result.filters === "string") {
    try {
      result.filters = JSON.parse(result.filters);
    } catch {}
  }

  if (result.orderBy && typeof result.orderBy === "string") {
    try {
      result.orderBy = JSON.parse(result.orderBy);
    } catch {}
  }

  if (result.pagination && typeof result.pagination === "string") {
    try {
      result.pagination = JSON.parse(result.pagination);
    } catch {}
  }

  return result;
}


type CriteriaQueryResult<
  F extends ZodObject<ZodRawShape>,
  O extends readonly string[]
> = {
  filters?: F extends { _fields: infer Fields } ? Fields : z.infer<F>;
  orderBy?: O extends readonly []
    ? never
    : OrderEnumValues<O> | OrderEnumValues<O>[];
  pagination?: { page: number; limit: number };
  search?: string;
};

/**
 * Build the complete Criteria query schema with filters, ordering, pagination and search.
 *
 * @param filterSchema - The filter schema built with `buildZodQueryParams`
 * @param options - Configuration options including orderBy whitelist
 *
 * @example
 * ```ts
 * const filterSchema = buildZodQueryParams((q) => ({
 *   name: q.string(),
 *   email: q.string(),
 *   age: q.number(),
 *   isActive: q.boolean(),
 *   createdAt: q.date(),
 *   ["posts.title"]: q.array.string(),
 * }));
 *
 * const querySchema = CriteriaQuerySchema(filterSchema, {
 *   orderBy: ["name", "createdAt", "email"] as const,
 * });
 *
 * // Type of orderBy will be: "name:asc" | "name:desc" | "createdAt:asc" | "createdAt:desc" | "email:asc" | "email:desc"
 * ```
 */
export function CriteriaQuerySchema<
  F extends ZodObject<ZodRawShape>,
  const O extends readonly string[] = readonly []
>(
  filterSchema: F,
  options?: CriteriaQueryOptions<O>
): z.ZodType<CriteriaQueryResult<F, O>> {
  const { orderBy: orderByFields, pagination: paginationOpts } = options ?? {};

  // Build order schema based on provided fields
  const orderSchema = orderByFields?.length
    ? buildOrderSchema(orderByFields)
    : z.never().optional();

  return z.preprocess(
    parseQueryInput,
    z.object({
      filters: filterSchema.optional(),
      orderBy: orderSchema,
      page: z.coerce
        .number()
        .min(1)
        .default(paginationOpts?.defaultPage ?? 1),
      limit: z.coerce
        .number()
        .min(1)
        .max(paginationOpts?.maxLimit ?? 100)
        .default(paginationOpts?.defaultLimit ?? 20),
      search: z.string().optional(),
    })
  ) as z.ZodType<CriteriaQueryResult<F, O>>;
}

function buildOrderSchema<const T extends readonly string[]>(fields: T) {
  if (fields.length === 0) {
    return z.never().optional();
  }

  const enumValues = fields.flatMap((field) => [
    `${field}:asc` as const,
    `${field}:desc` as const,
  ]) as [string, ...string[]];

  return z
    .union([
      z.enum(enumValues as [string, ...string[]]),
      z
        .string()
        .transform((val) => val.split(",").map((v) => v.trim()))
        .pipe(z.array(z.enum(enumValues as [string, ...string[]]))),
      z.array(z.enum(enumValues as [string, ...string[]])),
    ])
    .optional();
}
/**
 * Build a schema for paginated API responses.
 *
 * @param itemSchema - The schema for individual items in the data array
 *
 * @example
 * ```ts
 * const UserOutputDto = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string(),
 * });
 *
 * const responseSchema = PaginatedResponseSchema(UserOutputDto);
 * ```
 */
export function PaginatedResponseSchema<T extends ZodObject<ZodRawShape>>(
  itemSchema: T
) {
  return z.object({
    data: z.array(itemSchema),
    meta: z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      total: z.number(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
      totalPages: z.number(),
    }),
  });
}

/**
 * Infer the TypeScript type from a CriteriaQuerySchema result
 */
export type InferCriteriaQuery<T> = T extends z.ZodType<infer O> ? O : never;

/**
 * Create order enum type from field names
 */
export type OrderEnum<T extends readonly string[]> = OrderEnumValue<T[number]>;

export { z };
