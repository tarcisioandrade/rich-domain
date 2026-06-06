import {
  ParsedProp,
  propToTypeScript,
  propToZod,
  propToValibot,
  propToArktype,
} from "./props-parser.js";

export type EntityType = "aggregate" | "entity" | "value-object";
export type ValidationLib = "zod" | "valibot" | "arktype" | "none";

export interface GenerateEntityOptions {
  name: string;
  type: EntityType;
  props: ParsedProp[];
  validation: ValidationLib;
}

/**
 * Convert name to different cases
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Get file suffix based on entity type
 */
function getFileSuffix(type: EntityType): string {
  switch (type) {
    case "aggregate":
      return "aggregate";
    case "entity":
      return "entity";
    case "value-object":
      return "value-object";
  }
}

/**
 * Get base class based on entity type
 */
function getBaseClass(type: EntityType): string {
  switch (type) {
    case "aggregate":
      return "Aggregate";
    case "entity":
      return "Entity";
    case "value-object":
      return "ValueObject";
  }
}

/**
 * Generate inline enum declaration
 */
function generateEnum(prop: ParsedProp): string {
  const enumName = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
  const values = prop.enumValues!.map((v) => `  ${v} = "${v}",`).join("\n");

  return `export enum ${enumName} {\n${values}\n}`;
}

/**
 * Generate entity file content
 */
export function generateEntityFile(options: GenerateEntityOptions): string {
  const { name, type, props, validation } = options;
  const lines: string[] = [];

  const pascalName = toPascalCase(name);
  const camelName = toCamelCase(name);
  const baseClass = getBaseClass(type);
  const isValueObject = type === "value-object";

  // Validate ValueObject structure
  if (isValueObject) {
    if (props.length !== 1) {
      throw new Error(
        "ValueObjects must have exactly one property of primitive type (string, number, boolean, or date)"
      );
    }
    const prop = props[0];
    if (prop.type === "relation" || prop.type === "enum") {
      throw new Error(
        "ValueObjects can only have primitive types (string, number, boolean, or date)"
      );
    }
    if (prop.isArray) {
      throw new Error("ValueObjects cannot have array types");
    }
  }

  // Imports
  if (isValueObject) {
    lines.push(`import { ValueObject } from "@woltz/rich-domain";`);
  } else {
    lines.push(`import { ${baseClass}, Id } from "@woltz/rich-domain";`);
  }

  if (validation === "zod") {
    lines.push(`import { z } from "zod";`);
  } else if (validation === "valibot") {
    lines.push(`import * as v from "valibot";`);
  } else if (validation === "arktype") {
    lines.push(`import { type } from "arktype";`);
  }

  lines.push("");

  // Generate inline enums
  const enumProps = props.filter((p) => p.type === "enum");
  if (enumProps.length > 0) {
    for (const prop of enumProps) {
      lines.push(generateEnum(prop));
      lines.push("");
    }
  }

  // Generate schema based on validation library
  const schemaName = `${camelName}Schema`;

  if (validation === "zod") {
    lines.push("/**");
    lines.push(` * ${pascalName} Validation Schema`);
    lines.push(" */");

    if (isValueObject) {
      // For ValueObjects, schema validates the primitive value directly
      const prop = props[0];
      lines.push(`export const ${schemaName} = ${propToZod(prop)};`);
    } else {
      lines.push(`export const ${schemaName} = z.object({`);
      lines.push("  id: z.instanceof(Id),");

      for (const prop of props) {
        lines.push(`  ${prop.name}: ${propToZod(prop)},`);
      }

      lines.push("});");
    }
    lines.push("");
  } else if (validation === "valibot") {
    lines.push("/**");
    lines.push(` * ${pascalName} Validation Schema`);
    lines.push(" */");

    if (isValueObject) {
      // For ValueObjects, schema validates the primitive value directly
      const prop = props[0];
      lines.push(`export const ${schemaName} = ${propToValibot(prop)};`);
    } else {
      lines.push(`export const ${schemaName} = v.object({`);
      lines.push("  id: v.instance(Id),");

      for (const prop of props) {
        lines.push(`  ${prop.name}: ${propToValibot(prop)},`);
      }

      lines.push("});");
    }
    lines.push("");
  } else if (validation === "arktype") {
    lines.push("/**");
    lines.push(` * ${pascalName} Validation Schema`);
    lines.push(" */");

    if (isValueObject) {
      // For ValueObjects, schema validates the primitive value directly
      const prop = props[0];
      lines.push(`export const ${schemaName} = ${propToArktype(prop)};`);
    } else {
      lines.push(`export const ${schemaName} = type({`);
      lines.push("  id: type.instanceOf(Id),");

      for (const prop of props) {
        lines.push(`  ${prop.name}: ${propToArktype(prop)},`);
      }

      lines.push("});");
    }
    lines.push("");
  }

  // Generate Props type (skip for ValueObjects)
  if (!isValueObject) {
    const hasRelations = props.some((p) => p.type === "relation");

    if (validation === "zod") {
      if (hasRelations) {
        lines.push("/**");
        lines.push(` * ${pascalName} Props Type`);
        lines.push(" */");
        lines.push(
          `export type ${pascalName}Props = z.infer<typeof ${schemaName}> & {`
        );
        for (const prop of props.filter((p) => p.type === "relation")) {
          lines.push(`  ${prop.name}: ${propToTypeScript(prop)};`);
        }
        lines.push("};");
      } else {
        lines.push(
          `export type ${pascalName}Props = z.infer<typeof ${schemaName}>;`
        );
      }
      lines.push("");
    } else if (validation === "valibot") {
      if (hasRelations) {
        lines.push("/**");
        lines.push(` * ${pascalName} Props Type`);
        lines.push(" */");
        lines.push(
          `export type ${pascalName}Props = v.InferOutput<typeof ${schemaName}> & {`
        );
        for (const prop of props.filter((p) => p.type === "relation")) {
          lines.push(`  ${prop.name}: ${propToTypeScript(prop)};`);
        }
        lines.push("};");
      } else {
        lines.push(
          `export type ${pascalName}Props = v.InferOutput<typeof ${schemaName}>;`
        );
      }
      lines.push("");
    } else if (validation === "arktype") {
      if (hasRelations) {
        lines.push("/**");
        lines.push(` * ${pascalName} Props Type`);
        lines.push(" */");
        lines.push(
          `export type ${pascalName}Props = typeof ${schemaName}.infer & {`
        );
        for (const prop of props.filter((p) => p.type === "relation")) {
          lines.push(`  ${prop.name}: ${propToTypeScript(prop)};`);
        }
        lines.push("};");
      } else {
        lines.push(
          `export type ${pascalName}Props = typeof ${schemaName}.infer;`
        );
      }
      lines.push("");
    } else {
      // No validation - just interface
      lines.push("/**");
      lines.push(` * ${pascalName} Props`);
      lines.push(" */");
      lines.push(`export interface ${pascalName}Props {`);
      lines.push("  id: Id;");

      for (const prop of props) {
        lines.push(`  ${prop.name}: ${propToTypeScript(prop)};`);
      }

      lines.push("}");
      lines.push("");
    }
  }

  // Generate class
  lines.push("/**");
  lines.push(` * ${pascalName} ${toPascalCase(type)}`);
  lines.push(" */");

  if (isValueObject) {
    // For ValueObjects, extend with primitive type
    const prop = props[0];
    const tsType = propToTypeScript(prop);
    lines.push(`export class ${pascalName} extends ${baseClass}<${tsType}> {`);
  } else {
    lines.push(
      `export class ${pascalName} extends ${baseClass}<${pascalName}Props> {`
    );
  }

  // Add validation if using validation library
  if (validation !== "none") {
    lines.push("  protected static validation = {");
    lines.push(`    schema: ${schemaName},`);
    lines.push("  };");
    lines.push("");
  }

  // Getters (skip for ValueObjects as they only have .value)
  if (!isValueObject) {
    lines.push(
      "  // ─────────────────────────────────────────────────────────────"
    );
    lines.push("  // Getters");
    lines.push(
      "  // ─────────────────────────────────────────────────────────────"
    );
    lines.push("");

    for (const prop of props) {
      const tsType = propToTypeScript(prop);
      const readonlyPrefix = prop.isArray ? "readonly " : "";
      lines.push(`  get ${prop.name}(): ${readonlyPrefix}${tsType} {`);
      lines.push(`    return this.props.${prop.name};`);
      lines.push("  }");
      lines.push("");
    }
  }

  // Factory method
  lines.push(
    "  // ─────────────────────────────────────────────────────────────"
  );
  lines.push("  // Factory");
  lines.push(
    "  // ─────────────────────────────────────────────────────────────"
  );
  lines.push("");

  if (isValueObject) {
    // For ValueObjects, factory receives primitive value directly
    const prop = props[0];
    const tsType = propToTypeScript(prop);
    lines.push(`  static create(value: ${tsType}): ${pascalName} {`);
    lines.push(`    return new ${pascalName}(value);`);
    lines.push("  }");
  } else {
    const requiredProps = props.filter((p) => !p.isOptional && !p.isArray);
    const optionalProps = props.filter((p) => p.isOptional || p.isArray);

    const propsType =
      requiredProps.length > 0
        ? `Pick<${pascalName}Props, ${requiredProps
            .map((p) => `"${p.name}"`)
            .join(" | ")}>`
        : "Partial<" + pascalName + "Props>";

    lines.push(`  static create(props: ${propsType}): ${pascalName} {`);
    lines.push(`    return new ${pascalName}({`);
    lines.push("      ...props,");
    lines.push("      id: new Id(),");

    // Default values for optional/array props
    for (const prop of optionalProps) {
      if (prop.isArray) {
        lines.push(`      ${prop.name}: props.${prop.name} ?? [],`);
      } else {
        lines.push(`      ${prop.name}: props.${prop.name} ?? null,`);
      }
    }

    lines.push("    });");
    lines.push("  }");
  }

  lines.push("");

  // Domain methods placeholder
  lines.push(
    "  // ─────────────────────────────────────────────────────────────"
  );
  lines.push("  // Domain Methods");
  lines.push(
    "  // ─────────────────────────────────────────────────────────────"
  );
  lines.push("");
  lines.push("  // Add your domain methods here");

  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate repository interface
 */
export function generateRepositoryInterface(
  name: string,
  type: EntityType
): string {
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);
  const suffix = getFileSuffix(type);

  const lines: string[] = [];

  lines.push(`import { Repository } from "@woltz/rich-domain";`);
  lines.push(
    `import { ${pascalName} } from "../entities/${kebabName}.${suffix}.js";`
  );
  lines.push("");
  lines.push("/**");
  lines.push(` * ${pascalName} Repository Interface`);
  lines.push(" */");
  lines.push(
    `export interface I${pascalName}Repository extends Repository<${pascalName}> {`
  );
  lines.push("  // Add custom query methods here");
  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate repository implementation
 */
export function generateRepositoryImpl(
  name: string,
  type: EntityType,
  hasPrisma: boolean = true
): string {
  const pascalName = toPascalCase(name);
  const camelName = toCamelCase(name);
  const kebabName = toKebabCase(name);
  const suffix = getFileSuffix(type);

  const lines: string[] = [];

  if (hasPrisma) {
    // Prisma-specific implementation
    lines.push(
      `import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";`
    );
    lines.push(`import type { Prisma, PrismaClient } from "@prisma/client";`);
    lines.push(
      `import { ${pascalName} } from "../../domain/entities/${kebabName}.${suffix}.js";`
    );
    lines.push(
      `import type { I${pascalName}Repository } from "../../domain/repository/${kebabName}.repository.js";`
    );
    lines.push(
      `import { ${pascalName}ToDomainMapper } from "../mappers/${kebabName}-to-domain.mapper.js";`
    );
    lines.push(
      `import { ${pascalName}ToPersistenceMapper } from "../mappers/${kebabName}-to-persistence.mapper.js";`
    );
    lines.push("");
    lines.push("/**");
    lines.push(` * ${pascalName} Repository Implementation`);
    lines.push(" */");
    lines.push(`export class ${pascalName}Repository`);
    lines.push(`  extends PrismaRepository<${pascalName}, any>`);
    lines.push(`  implements I${pascalName}Repository`);
    lines.push("{");
    lines.push(`  protected model = "${camelName}" as const;`);
    lines.push(
      `  protected includes = {} satisfies Prisma.${pascalName}Include;`
    );
    lines.push("");
    lines.push("  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {");
    lines.push("    super(");
    lines.push(`      new ${pascalName}ToPersistenceMapper(prisma, uow),`);
    lines.push(`      new ${pascalName}ToDomainMapper(),`);
    lines.push("      prisma,");
    lines.push("      uow");
    lines.push("    );");
    lines.push("  }");
    lines.push("");
    lines.push(
      `  generateSearchQuery(search: string): Prisma.${pascalName}WhereInput[] {`
    );
    lines.push(`    return [] satisfies Prisma.${pascalName}WhereInput[];`);
    lines.push("  }");
    lines.push("}");
  } else {
    // Generic implementation without Prisma
    lines.push(`import { Criteria, Page } from "@woltz/rich-domain";`);
    lines.push(
      `import { ${pascalName} } from "../../domain/entities/${kebabName}.${suffix}.js";`
    );
    lines.push(
      `import type { I${pascalName}Repository } from "../../domain/repository/${kebabName}.repository.js";`
    );
    lines.push("");
    lines.push("/**");
    lines.push(` * ${pascalName} Repository Implementation`);
    lines.push(" *");
    lines.push(" * TODO: Implement with your preferred database/ORM");
    lines.push(" */");
    lines.push(
      `export class ${pascalName}Repository implements I${pascalName}Repository {`
    );
    lines.push("");
    lines.push(`  async findById(id: string): Promise<${pascalName} | null> {`);
    lines.push("    // TODO: Implement");
    lines.push("    throw new Error('Not implemented');");
    lines.push("  }");
    lines.push("");
    lines.push(
      `  async findAll(criteria?: Criteria<${pascalName}>): Promise<Page<${pascalName}>> {`
    );
    lines.push("    // TODO: Implement");
    lines.push("    throw new Error('Not implemented');");
    lines.push("  }");
    lines.push("");
    lines.push(`  async save(entity: ${pascalName}): Promise<void> {`);
    lines.push("    // TODO: Implement");
    lines.push("    throw new Error('Not implemented');");
    lines.push("  }");
    lines.push("");
    lines.push(`  async delete(entity: ${pascalName}): Promise<void> {`);
    lines.push("    // TODO: Implement");
    lines.push("    throw new Error('Not implemented');");
    lines.push("  }");
    lines.push("}");
  }

  return lines.join("\n");
}

/**
 * Generate ToDomain mapper
 */
export function generateToDomainMapper(
  name: string,
  type: EntityType,
  props: ParsedProp[]
): string {
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);
  const suffix = getFileSuffix(type);
  const isValueObject = type === "value-object";

  const lines: string[] = [];

  lines.push(`import { Mapper, Id } from "@woltz/rich-domain";`);
  lines.push(
    `import { ${pascalName} } from "../../domain/entities/${kebabName}.${suffix}.js";`
  );
  lines.push("");
  lines.push("/**");
  lines.push(` * Map Prisma ${pascalName} to Domain ${pascalName}`);
  lines.push(" */");
  lines.push(
    `export class ${pascalName}ToDomainMapper extends Mapper<any, ${pascalName}> {`
  );
  lines.push(`  build(raw: any): ${pascalName} {`);
  lines.push(`    return new ${pascalName}({`);

  if (!isValueObject) {
    lines.push("      id: Id.from(raw.id),");
  }

  for (const prop of props) {
    if (prop.type === "relation") {
      if (prop.isArray) {
        lines.push(`      ${prop.name}: [], // TODO: Map relations`);
      } else {
        lines.push(`      ${prop.name}: null, // TODO: Map relation`);
      }
    } else {
      lines.push(`      ${prop.name}: raw.${prop.name},`);
    }
  }

  lines.push("    });");
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate ToPersistence mapper
 */
export function generateToPersistenceMapper(
  name: string,
  type: EntityType,
  hasPrisma: boolean = true
): string {
  const pascalName = toPascalCase(name);
  const camelName = toCamelCase(name);
  const kebabName = toKebabCase(name);
  const suffix = getFileSuffix(type);

  const lines: string[] = [];

  if (hasPrisma) {
    // Prisma-specific mapper
    lines.push(`import {`);
    lines.push(`  PrismaToPersistence,`);
    lines.push(`} from "@woltz/rich-domain-prisma";`);
    lines.push(`import { EntitySchemaRegistry } from "@woltz/rich-domain";`);
    lines.push(
      `import { ${pascalName} } from "../../domain/entities/${kebabName}.${suffix}.js";`
    );
    lines.push("");
    lines.push("/**");
    lines.push(` * Map Domain ${pascalName} to Prisma persistence`);
    lines.push(" */");
    lines.push(
      `export class ${pascalName}ToPersistenceMapper extends PrismaToPersistence<${pascalName}> {`
    );
    lines.push(
      "  protected readonly registry = new EntitySchemaRegistry().register({"
    );
    lines.push(`    entity: "${pascalName}",`);
    lines.push(`    table: "${camelName}",`);
    lines.push("  });");
    lines.push("");
    lines.push(`  protected async onCreate(entity: ${pascalName}) {`);
    lines.push(`    await this.context.${camelName}.create({`);
    lines.push("      data: {");
    lines.push("        id: entity.id.value,");
    lines.push("        // TODO: Add other fields");
    lines.push("      },");
    lines.push("    });");
    lines.push("  }");
    lines.push("}");
  } else {
    // Generic mapper without Prisma
    lines.push(`import { Mapper } from "@woltz/rich-domain";`);
    lines.push(
      `import { ${pascalName} } from "../../domain/entities/${kebabName}.${suffix}.js";`
    );
    lines.push("");
    lines.push("/**");
    lines.push(` * Map Domain ${pascalName} to persistence format`);
    lines.push(" *");
    lines.push(" * TODO: Implement with your preferred database/ORM");
    lines.push(" */");
    lines.push(
      `export class ${pascalName}ToPersistenceMapper extends Mapper<${pascalName}, any> {`
    );
    lines.push(`  build(entity: ${pascalName}): any {`);
    lines.push("    return {");
    lines.push("      id: entity.id.value,");
    lines.push("      // TODO: Add other fields");
    lines.push("    };");
    lines.push("  }");
    lines.push("}");
  }

  return lines.join("\n");
}

/**
 * Get file paths for generated files
 */
export function getFilePaths(
  name: string,
  type: EntityType,
  outputDir: string,
  withRepo: boolean,
  withMapper: boolean
): { path: string; content: string }[] {
  const kebabName = toKebabCase(name);
  const suffix = getFileSuffix(type);

  const files: { path: string; type: string }[] = [];

  // Entity file is always generated
  files.push({
    path: `${outputDir}/domain/entities/${kebabName}.${suffix}.ts`,
    type: "entity",
  });

  if (withRepo) {
    files.push({
      path: `${outputDir}/domain/repository/${kebabName}.repository.ts`,
      type: "repo-interface",
    });
    files.push({
      path: `${outputDir}/infra/repository/${kebabName}.repository.ts`,
      type: "repo-impl",
    });
  }

  if (withMapper) {
    files.push({
      path: `${outputDir}/infra/mappers/${kebabName}-to-domain.mapper.ts`,
      type: "mapper-to-domain",
    });
    files.push({
      path: `${outputDir}/infra/mappers/${kebabName}-to-persistence.mapper.ts`,
      type: "mapper-to-persistence",
    });
  }

  return files.map((f) => ({ path: f.path, content: "" }));
}
