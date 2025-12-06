import pkg from "@prisma/internals";
import { readFileSync } from "node:fs";
const { getDMMF } = pkg;

/**
 * Prisma field type
 */
export interface PrismaField {
  name: string;
  type: string;
  kind: "scalar" | "object" | "enum" | "unsupported";
  isList: boolean;
  isRequired: boolean;
  isUnique: boolean;
  isId: boolean;
  isUpdatedAt: boolean;
  isGenerated: boolean;
  hasDefaultValue: boolean;
  default?: unknown;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  documentation?: string;
}

/**
 * Prisma model
 */
export interface PrismaModel {
  name: string;
  fields: PrismaField[];
  primaryKey: string | null;
  uniqueFields: string[][];
  documentation?: string;
}

/**
 * Prisma enum
 */
export interface PrismaEnum {
  name: string;
  values: string[];
  documentation?: string;
}

/**
 * Parsed Prisma schema
 */
export interface ParsedSchema {
  models: PrismaModel[];
  enums: PrismaEnum[];
}

/**
 * Parse a Prisma schema file and extract models and enums
 */
export async function parsePrismaSchema(
  schemaPath: string
): Promise<ParsedSchema> {
  // Read the schema file content
  const schemaContent = readFileSync(schemaPath, "utf-8");

  // Parse using getDMMF with datamodel string
  const dmmf = await getDMMF({ datamodel: schemaContent });

  const models: any = dmmf.datamodel.models.map((model) => ({
    name: model.name,
    documentation: model.documentation ?? undefined,
    primaryKey: model.primaryKey?.fields?.[0] ?? null,
    uniqueFields: model.uniqueFields,
    fields: model.fields.map((field) => ({
      name: field.name,
      type: field.type,
      kind: field.kind as PrismaField["kind"],
      isList: field.isList,
      isRequired: field.isRequired,
      isUnique: field.isUnique,
      isId: field.isId,
      isUpdatedAt: field.isUpdatedAt,
      isGenerated: field.isGenerated,
      hasDefaultValue: field.hasDefaultValue,
      default: field.default,
      relationName: field.relationName ?? undefined,
      relationFromFields: field.relationFromFields ?? undefined,
      relationToFields: field.relationToFields ?? undefined,
      documentation: field.documentation ?? undefined,
    })),
  }));

  const enums: PrismaEnum[] = dmmf.datamodel.enums.map((e) => ({
    name: e.name,
    values: e.values.map((v) => v.name),
    documentation: e.documentation ?? undefined,
  }));

  return { models, enums };
}

/**
 * Get scalar fields (non-relation fields)
 */
export function getScalarFields(model: PrismaModel): PrismaField[] {
  return model.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
}

/**
 * Get relation fields
 */
export function getRelationFields(model: PrismaModel): PrismaField[] {
  return model.fields.filter((f) => f.kind === "object");
}

/**
 * Check if model has any relations
 */
export function hasRelations(model: PrismaModel): boolean {
  return model.fields.some((f) => f.kind === "object");
}

/**
 * Get the ID field of a model
 */
export function getIdField(model: PrismaModel): PrismaField | undefined {
  return model.fields.find((f) => f.isId);
}

/**
 * Check if a field is a timestamp field (createdAt, updatedAt)
 */
export function isTimestampField(field: PrismaField): boolean {
  return (
    field.isUpdatedAt ||
    field.name === "createdAt" ||
    field.name === "updatedAt"
  );
}

/**
 * Check if a field should be included in create() factory method
 */
export function isCreateField(field: PrismaField): boolean {
  // Exclude: id, timestamps, generated fields, relations
  return (
    !field.isId &&
    !isTimestampField(field) &&
    !field.isGenerated &&
    field.kind !== "object"
  );
}

/**
 * Check if field is a foreign key (ends with Id and has relation)
 */
export function isForeignKey(field: PrismaField, model: PrismaModel): boolean {
  if (!field.name.endsWith("Id")) return false;

  const baseName = field.name.slice(0, -2);
  return model.fields.some((f) => f.name === baseName && f.kind === "object");
}

/**
 * Map Prisma type to TypeScript type
 */
export function prismaTypeToTs(field: PrismaField): string {
  const typeMap: Record<string, string> = {
    String: "string",
    Int: "number",
    Float: "number",
    Decimal: "number",
    Boolean: "boolean",
    DateTime: "Date",
    Json: "unknown",
    BigInt: "bigint",
    Bytes: "Buffer",
  };

  if (field.kind === "enum") {
    return field.type;
  }

  if (field.kind === "object") {
    return field.type;
  }

  const baseType = typeMap[field.type] ?? "unknown";

  if (field.isList) {
    return `${baseType}[]`;
  }

  if (!field.isRequired) {
    return `${baseType} | null`;
  }

  return baseType;
}

/**
 * Map Prisma type to Zod schema
 */
export function prismaTypeToZod(field: PrismaField): string {
  const zodMap: Record<string, string> = {
    String: "z.string()",
    Int: "z.number().int()",
    Float: "z.number()",
    Decimal: "z.number()",
    Boolean: "z.boolean()",
    DateTime: "z.date()",
    Json: "z.unknown()",
    BigInt: "z.bigint()",
    Bytes: "z.instanceof(Buffer)",
  };

  // Special cases for common field names
  if (field.name === "email") {
    return "z.email()";
  }
  if (field.name === "password") {
    return "z.string().min(8)";
  }
  if (field.name === "url" || field.name.endsWith("Url")) {
    return "z.string().url()";
  }

  let zodType: string;

  if (field.kind === "enum") {
    // Will be handled separately
    zodType = `z.nativeEnum(${field.type})`;
  } else if (field.kind === "object") {
    // Relation - use instanceof
    zodType = `z.instanceof(${field.type})`;
  } else {
    zodType = zodMap[field.type] ?? "z.unknown()";
  }

  // Handle lists
  if (field.isList) {
    zodType = `z.array(${zodType})`;
  }

  // Handle nullable
  if (!field.isRequired) {
    zodType = `${zodType}.nullable()`;
  }

  // Handle defaults
  if (field.hasDefaultValue && field.default !== undefined) {
    const defaultValue = formatDefaultValue(field.default, field.type);
    if (defaultValue) {
      zodType = `${zodType}.default(${defaultValue})`;
    }
  }

  return zodType;
}

/**
 * Format default value for Zod
 */
function formatDefaultValue(value: unknown, type: string): string | null {
  if (value === null || value === undefined) return null;

  // Handle Prisma function defaults like now(), uuid(), etc
  if (typeof value === "object" && value !== null && "name" in value) {
    const funcName = (value as { name: string }).name;
    if (funcName === "now") return null; // Handle at runtime
    if (funcName === "uuid" || funcName === "cuid") return null; // Handle at runtime
    return null;
  }

  if (type === "String") {
    return `"${value}"`;
  }
  if (type === "Int" || type === "Float" || type === "Decimal") {
    return String(value);
  }
  if (type === "Boolean") {
    return String(value);
  }

  return null;
}

/**
 * Convert PascalCase to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Convert PascalCase to camelCase
 */
export function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
