/**
 * Parsed property from CLI input
 */
export interface ParsedProp {
  name: string;
  type: PropType;
  isOptional: boolean;
  isArray: boolean;
  enumValues?: string[]; // For enum types
  relationType?: string; // For relation types (User, Post, etc)
}

export type PropType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "relation";

/**
 * Parse a single prop definition
 *
 * Examples:
 * - "name:string" → { name: "name", type: "string", isOptional: false, isArray: false }
 * - "age:number?" → { name: "age", type: "number", isOptional: true, isArray: false }
 * - "tags:string[]" → { name: "tags", type: "string", isOptional: false, isArray: true }
 * - "role:(USER,ADMIN)" → { name: "role", type: "enum", enumValues: ["USER", "ADMIN"] }
 * - "author:User" → { name: "author", type: "relation", relationType: "User" }
 * - "items:OrderItem[]" → { name: "items", type: "relation", relationType: "OrderItem", isArray: true }
 */
export function parseProp(input: string): ParsedProp {
  const colonIndex = input.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid prop format: "${input}". Expected "name:type"`);
  }

  const name = input.slice(0, colonIndex).trim();
  let typeStr = input.slice(colonIndex + 1).trim();

  if (!name) {
    throw new Error(`Invalid prop: missing name in "${input}"`);
  }

  if (!typeStr) {
    throw new Error(`Invalid prop: missing type in "${input}"`);
  }

  // Check for optional (?)
  const isOptional = typeStr.endsWith("?");
  if (isOptional) {
    typeStr = typeStr.slice(0, -1);
  }

  // Check for array ([])
  const isArray = typeStr.endsWith("[]");
  if (isArray) {
    typeStr = typeStr.slice(0, -2);
  }

  // Check for enum - (VALUE1,VALUE2,...)
  const enumMatch = typeStr.match(/^\(([^)]+)\)$/);
  if (enumMatch) {
    const enumValues = enumMatch[1]
      .split(",")
      .map((v) => v.trim().toUpperCase());

    if (enumValues.length === 0) {
      throw new Error(`Invalid enum: no values in "${input}"`);
    }

    return {
      name,
      type: "enum",
      isOptional,
      isArray,
      enumValues,
    };
  }

  // Check for primitive types
  const primitiveTypes = ["string", "number", "boolean", "date"];
  const lowerType = typeStr.toLowerCase();

  if (primitiveTypes.includes(lowerType)) {
    return {
      name,
      type: lowerType as PropType,
      isOptional,
      isArray,
    };
  }

  // Otherwise it's a relation (starts with uppercase)
  if (typeStr[0] === typeStr[0].toUpperCase()) {
    return {
      name,
      type: "relation",
      isOptional,
      isArray,
      relationType: typeStr,
    };
  }

  throw new Error(
    `Unknown type "${typeStr}" in "${input}". Use string, number, boolean, date, (ENUM,VALUES), or EntityName`
  );
}

/**
 * Parse multiple props from CLI args
 */
export function parseProps(args: string[]): ParsedProp[] {
  return args.map(parseProp);
}

/**
 * Convert parsed prop to TypeScript type string
 */
export function propToTypeScript(prop: ParsedProp): string {
  let baseType: string;

  switch (prop.type) {
    case "string":
      baseType = "string";
      break;
    case "number":
      baseType = "number";
      break;
    case "boolean":
      baseType = "boolean";
      break;
    case "date":
      baseType = "Date";
      break;
    case "enum":
      // Enum name is derived from prop name (capitalize first letter)
      baseType = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
      break;
    case "relation":
      baseType = prop.relationType!;
      break;
    default:
      baseType = "unknown";
  }

  if (prop.isArray) {
    baseType = `${baseType}[]`;
  }

  if (prop.isOptional) {
    baseType = `${baseType} | null`;
  }

  return baseType;
}

/**
 * Convert parsed prop to Zod schema string
 */
export function propToZod(prop: ParsedProp): string {
  let zodType: string;

  switch (prop.type) {
    case "string":
      zodType = "z.string()";
      break;
    case "number":
      zodType = "z.number()";
      break;
    case "boolean":
      zodType = "z.boolean()";
      break;
    case "date":
      zodType = "z.date()";
      break;
    case "enum":
      const enumName = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
      zodType = `z.nativeEnum(${enumName})`;
      break;
    case "relation":
      // Relations are not validated in schema (to avoid circular deps)
      zodType = "z.any()";
      break;
    default:
      zodType = "z.unknown()";
  }

  if (prop.isArray) {
    zodType = `z.array(${zodType})`;
  }

  if (prop.isOptional) {
    zodType = `${zodType}.nullable()`;
  }

  return zodType;
}

/**
 * Convert parsed prop to Valibot schema string
 */
export function propToValibot(prop: ParsedProp): string {
  let valibotType: string;

  switch (prop.type) {
    case "string":
      valibotType = "v.string()";
      break;
    case "number":
      valibotType = "v.number()";
      break;
    case "boolean":
      valibotType = "v.boolean()";
      break;
    case "date":
      valibotType = "v.date()";
      break;
    case "enum":
      const enumName = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
      valibotType = `v.enum(${enumName})`;
      break;
    case "relation":
      valibotType = "v.any()";
      break;
    default:
      valibotType = "v.unknown()";
  }

  if (prop.isArray) {
    valibotType = `v.array(${valibotType})`;
  }

  if (prop.isOptional) {
    valibotType = `v.nullable(${valibotType})`;
  }

  return valibotType;
}

/**
 * Convert parsed prop to ArkType schema string
 */
export function propToArktype(prop: ParsedProp): string {
  let arkType: string;

  switch (prop.type) {
    case "string":
      arkType = '"string"';
      break;
    case "number":
      arkType = '"number"';
      break;
    case "boolean":
      arkType = '"boolean"';
      break;
    case "date":
      arkType = '"Date"';
      break;
    case "enum":
      const values = prop.enumValues!.map((v) => `"${v}"`).join(" | ");
      arkType = `"${values}"`;
      break;
    case "relation":
      arkType = '"unknown"';
      break;
    default:
      arkType = '"unknown"';
  }

  if (prop.isArray) {
    arkType = `${arkType}.array()`;
  }

  if (prop.isOptional) {
    arkType = `${arkType}.or("null")`;
  }

  return arkType;
}
