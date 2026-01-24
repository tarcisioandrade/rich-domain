import type { PrismaModel, PrismaField, PrismaEnum } from "./prisma-parser.js";
import {
  getScalarFields,
  getRelationFields,
  isTimestampField,
  prismaTypeToZod,
  prismaTypeToValibot,
  prismaTypeToArktype,
  toKebabCase,
  toCamelCase,
} from "./prisma-parser.js";

/**
 * Options for code generation
 */
export interface GenerateOptions {
  validation: "zod" | "valibot" | "arktype" | "none";
  outputDir: string;
  generatePrismaFiles: boolean;
}

/**
 * Generated file content
 */
export interface GeneratedFile {
  path: string;
  content: string;
}

/**
 * Generate all files for a model
 */
export function generateModelFiles(
  model: PrismaModel,
  options: GenerateOptions
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const fileName = toKebabCase(model.name);

  // domain/entities -> Aggregate with inline schema
  files.push({
    path: `${options.outputDir}/domain/entities/${fileName}.aggregate.ts`,
    content: generateAggregateWithSchema(model, options),
  });

  if (options.generatePrismaFiles) {
    // domain/repository -> Repository interface
    files.push({
      path: `${options.outputDir}/domain/repository/${fileName}.repository.ts`,
      content: generateRepositoryInterface(model),
    });

    // infra/schemas -> Prisma type definitions
    files.push({
      path: `${options.outputDir}/infra/schemas/${fileName}.schema.ts`,
      content: generatePrismaSchema(model),
    });

    // infra/mappers -> ToDomain mapper
    files.push({
      path: `${options.outputDir}/infra/mappers/${fileName}-to-domain.mapper.ts`,
      content: generateToDomainMapper(model),
    });

    // infra/mappers -> ToPersistence mapper
    files.push({
      path: `${options.outputDir}/infra/mappers/${fileName}-to-persistence.mapper.ts`,
      content: generateToPersistenceMapper(model),
    });

    // infra/repository -> Repository implementation
    files.push({
      path: `${options.outputDir}/infra/repository/${fileName}.repository.ts`,
      content: generateRepositoryImplementation(model),
    });
  }

  return files;
}

/**
 * Generate index files for each folder
 */
export function generateIndexFiles(
  models: PrismaModel[],
  options: GenerateOptions
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // domain/entities/index.ts
  const entityExports = models.map((m) => {
    const fileName = toKebabCase(m.name);
    return `export * from "./${fileName}.aggregate.js";`;
  });
  files.push({
    path: `${options.outputDir}/domain/entities/index.ts`,
    content: entityExports.join("\n"),
  });

  if (options.generatePrismaFiles) {
    // domain/repository/index.ts
    const repoInterfaceExports = models.map((m) => {
      const fileName = toKebabCase(m.name);
      return `export * from "./${fileName}.repository.js";`;
    });
    files.push({
      path: `${options.outputDir}/domain/repository/index.ts`,
      content: repoInterfaceExports.join("\n"),
    });

    // infra/schemas/index.ts
    const schemaExports = models.map((m) => {
      const fileName = toKebabCase(m.name);
      return `export * from "./${fileName}.schema.js";`;
    });
    files.push({
      path: `${options.outputDir}/infra/schemas/index.ts`,
      content: schemaExports.join("\n"),
    });

    // infra/mappers/index.ts
    const mapperExports = models.flatMap((m) => {
      const fileName = toKebabCase(m.name);
      return [
        `export * from "./${fileName}-to-domain.mapper.js";`,
        `export * from "./${fileName}-to-persistence.mapper.js";`,
      ];
    });
    files.push({
      path: `${options.outputDir}/infra/mappers/index.ts`,
      content: mapperExports.join("\n"),
    });

    // infra/repository/index.ts
    const repoImplExports = models.map((m) => {
      const fileName = toKebabCase(m.name);
      return `export * from "./${fileName}.repository.js";`;
    });
    files.push({
      path: `${options.outputDir}/infra/repository/index.ts`,
      content: repoImplExports.join("\n"),
    });
  }

  return files;
}

/**
 * Generate enums file
 */
export function generateEnumsFile(
  enums: PrismaEnum[],
  options: GenerateOptions
): GeneratedFile {
  const lines: string[] = [
    "/**",
    " * Auto-generated enums from Prisma schema",
    " */",
    "",
  ];

  for (const e of enums) {
    if (e.documentation) {
      lines.push(`/** ${e.documentation} */`);
    }
    lines.push(`export enum ${e.name} {`);
    for (const value of e.values) {
      lines.push(`  ${value} = "${value}",`);
    }
    lines.push("}");
    lines.push("");
  }

  return {
    path: `${options.outputDir}/domain/entities/enums.ts`,
    content: lines.join("\n"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate with inline Schema
// ─────────────────────────────────────────────────────────────────────────────

function generateAggregateWithSchema(
  model: PrismaModel,
  options: GenerateOptions
): string {
  const lines: string[] = [];
  const scalarFields = getScalarFields(model).filter((f) => !f.isId);
  const relationFields = getRelationFields(model);

  const enumImports = new Set<string>();

  // Collect enum imports
  for (const field of scalarFields) {
    if (field.kind === "enum") {
      enumImports.add(field.type);
    }
  }

  // Imports based on validation type
  lines.push(
    'import { Aggregate, Id, EntityValidation } from "@woltz/rich-domain";'
  );

  if (options.validation === "zod") {
    lines.push('import { z } from "zod";');
  } else if (options.validation === "valibot") {
    lines.push('import * as v from "valibot";');
  } else if (options.validation === "arktype") {
    lines.push('import { type } from "arktype";');
  }

  if (enumImports.size > 0) {
    lines.push(
      `import { ${Array.from(enumImports).join(", ")} } from "./enums.js";`
    );
  }

  lines.push("");

  // Generate schema based on validation type
  if (options.validation === "zod") {
    lines.push(...generateZodSchemaLines(model, scalarFields));
  } else if (options.validation === "valibot") {
    lines.push(
      ...generateValibotSchemaLines(model, scalarFields, relationFields)
    );
  } else if (options.validation === "arktype") {
    lines.push(
      ...generateArktypeSchemaLines(model, scalarFields, relationFields)
    );
  } else {
    lines.push(...generateInterfaceLines(model, scalarFields, relationFields));
  }

  lines.push("");

  // Class definition
  lines.push("/**");
  lines.push(` * ${model.name} Aggregate`);
  lines.push(" * Auto-generated from Prisma schema - Add your domain logic");
  if (model.documentation) {
    lines.push(` * ${model.documentation}`);
  }
  lines.push(" */");
  lines.push(
    `export class ${model.name} extends Aggregate<${model.name}Props> {`
  );

  // Add validation only if using a validation library
  if (options.validation !== "none") {
    const schemaName = `${toCamelCase(model.name)}Schema`;
    lines.push(
      `  protected static validation: EntityValidation<${model.name}Props> = {`
    );
    lines.push(`    schema: ${schemaName},`);
    lines.push("  };");
    lines.push("");
  }

  if (scalarFields.length > 0) {
    // Getters
    lines.push(
      "  // ─────────────────────────────────────────────────────────────"
    );
    lines.push("  // Getters");
    lines.push(
      "  // ─────────────────────────────────────────────────────────────"
    );

    for (const field of scalarFields) {
      const tsType = getTypeScriptType(field);
      lines.push(`  get ${field.name}(): ${tsType} {`);
      lines.push(`    return this.props.${field.name};`);
      lines.push("  }");
      lines.push("");
    }
  }

  lines.push("}");

  return lines.join("\n");
}

function generateZodSchemaLines(
  model: PrismaModel,
  scalarFields: PrismaField[]
): string[] {
  const lines: string[] = [];
  const schemaName = `${toCamelCase(model.name)}Schema`;

  lines.push("/**");
  lines.push(` * ${model.name} Validation Schema (scalar fields only)`);
  lines.push(" */");
  lines.push(`export const ${schemaName} = z.object({`);
  lines.push("  id: z.instanceof(Id),");

  for (const field of scalarFields) {
    const zodType = prismaTypeToZod(field);
    lines.push(`  ${field.name}: ${zodType},`);
  }

  lines.push("});");
  lines.push("");

  // Props type extends schema inference + relations
  lines.push(`export type ${model.name}Props = z.infer<typeof ${schemaName}>;`);

  return lines;
}

function generateValibotSchemaLines(
  model: PrismaModel,
  scalarFields: PrismaField[],
  relationFields: PrismaField[]
): string[] {
  const lines: string[] = [];
  const schemaName = `${toCamelCase(model.name)}Schema`;

  lines.push("/**");
  lines.push(` * ${model.name} Validation Schema (scalar fields only)`);
  lines.push(" */");
  lines.push(`export const ${schemaName} = v.object({`);
  lines.push("  id: v.instance(Id),");

  for (const field of scalarFields) {
    const valibotType = prismaTypeToValibot(field);
    lines.push(`  ${field.name}: ${valibotType},`);
  }

  lines.push("});");
  lines.push("");

  // Props type extends schema inference + relations
  if (relationFields.length > 0) {
    lines.push("/**");
    lines.push(` * ${model.name} Props Type`);
    lines.push(" */");
    lines.push(
      `export type ${model.name}Props = v.InferOutput<typeof ${schemaName}> & {`
    );

    for (const field of relationFields) {
      const tsType = field.isList
        ? `${field.type}[]`
        : field.isRequired
          ? field.type
          : `${field.type} | null`;
      lines.push(`  ${field.name}: ${tsType};`);
    }

    lines.push("};");
  } else {
    lines.push(
      `export type ${model.name}Props = v.InferOutput<typeof ${schemaName}>;`
    );
  }

  return lines;
}

function generateArktypeSchemaLines(
  model: PrismaModel,
  scalarFields: PrismaField[],
  relationFields: PrismaField[]
): string[] {
  const lines: string[] = [];
  const schemaName = `${toCamelCase(model.name)}Schema`;

  lines.push("/**");
  lines.push(` * ${model.name} Validation Schema (scalar fields only)`);
  lines.push(" */");
  lines.push(`export const ${schemaName} = type({`);
  lines.push("  id: type.instanceOf(Id),");

  for (const field of scalarFields) {
    const arktypeType = prismaTypeToArktype(field);
    lines.push(`  ${field.name}: ${arktypeType},`);
  }

  lines.push("});");
  lines.push("");

  // Props type extends schema inference + relations
  if (relationFields.length > 0) {
    lines.push("/**");
    lines.push(` * ${model.name} Props Type`);
    lines.push(" */");
    lines.push(
      `export type ${model.name}Props = typeof ${schemaName}.infer & {`
    );

    for (const field of relationFields) {
      const tsType = field.isList
        ? `${field.type}[]`
        : field.isRequired
          ? field.type
          : `${field.type} | null`;
      lines.push(`  ${field.name}: ${tsType};`);
    }

    lines.push("};");
  } else {
    lines.push(`export type ${model.name}Props = typeof ${schemaName}.infer;`);
  }

  return lines;
}

function generateInterfaceLines(
  model: PrismaModel,
  scalarFields: PrismaField[],
  relationFields: PrismaField[]
): string[] {
  const lines: string[] = [];

  lines.push("/**");
  lines.push(` * ${model.name} Props`);
  lines.push(" */");
  lines.push(`export interface ${model.name}Props {`);
  lines.push("  id: Id;");

  for (const field of scalarFields) {
    const tsType = getTypeScriptType(field);
    lines.push(`  ${field.name}: ${tsType};`);
  }

  for (const field of relationFields) {
    const tsType = field.isList
      ? `${field.type}[]`
      : field.isRequired
        ? field.type
        : `${field.type} | null`;
    lines.push(`  ${field.name}: ${tsType};`);
  }

  lines.push("}");

  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Interface (domain/repository)
// ─────────────────────────────────────────────────────────────────────────────

function generateRepositoryInterface(model: PrismaModel): string {
  const lines: string[] = [];
  const fileName = toKebabCase(model.name);

  lines.push('import { Repository } from "@woltz/rich-domain";');
  lines.push(
    `import { ${model.name} } from "../entities/${fileName}.aggregate.js";`
  );
  lines.push("");

  lines.push("/**");
  lines.push(` * ${model.name} Repository Interface`);
  lines.push(" */");
  lines.push(
    `export interface I${model.name}Repository extends Repository<${model.name}> {`
  );
  lines.push("  // Add custom query methods here");
  lines.push("}");

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Prisma Schema Types (infra/schemas)
// ─────────────────────────────────────────────────────────────────────────────

function generatePrismaSchema(model: PrismaModel): string {
  const lines: string[] = [];
  const relationFields = getRelationFields(model);

  // Collect all Prisma types needed
  const prismaTypes = new Set<string>([model.name]);
  for (const field of relationFields) {
    prismaTypes.add(field.type);
  }

  // Import all Prisma types
  const prismaImports = Array.from(prismaTypes)
    .map((t) => `${t} as Prisma${t}`)
    .join(", ");
  lines.push(`import { ${prismaImports} } from "@prisma/client";`);
  lines.push("");

  lines.push("/**");
  lines.push(` * Prisma ${model.name} with relations`);
  lines.push(" */");

  if (relationFields.length > 0) {
    lines.push(
      `export type Prisma${model.name}WithRelations = Prisma${model.name} & {`
    );
    for (const field of relationFields) {
      const relationType = field.isList
        ? `Prisma${field.type}[]`
        : field.isRequired
          ? `Prisma${field.type}`
          : `Prisma${field.type} | null`;
      lines.push(`  ${field.name}?: ${relationType};`);
    }
    lines.push("};");
  } else {
    lines.push(
      `export type Prisma${model.name}WithRelations = Prisma${model.name};`
    );
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// ToDomain Mapper (infra/mappers)
// ─────────────────────────────────────────────────────────────────────────────

function generateToDomainMapper(model: PrismaModel): string {
  const lines: string[] = [];
  const scalarFields = getScalarFields(model);
  const fileName = toKebabCase(model.name);

  lines.push('import { Mapper, Id } from "@woltz/rich-domain";');
  lines.push(
    `import { Prisma${model.name}WithRelations } from "../schemas/${fileName}.schema.js";`
  );

  lines.push(
    `import { ${model.name} } from "../../domain/entities/${fileName}.aggregate.js";`
  );

  lines.push("");

  lines.push("/**");
  lines.push(` * Maps Prisma ${model.name} to Domain Entity`);
  lines.push(" */");
  lines.push(
    `export class ${model.name}ToDomainMapper extends Mapper<Prisma${model.name}WithRelations, ${model.name}> {`
  );
  lines.push(`  build(raw: Prisma${model.name}WithRelations): ${model.name} {`);
  lines.push(`    return new ${model.name}({`);
  lines.push("      id: Id.from(raw.id),");

  // Scalar fields
  for (const field of scalarFields) {
    if (field.isId) continue;
    lines.push(`      ${field.name}: raw.${field.name},`);
  }

  lines.push("    });");
  lines.push("  }");

  lines.push("}");

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// ToPersistence Mapper (infra/mappers)
// ─────────────────────────────────────────────────────────────────────────────

function generateToPersistenceMapper(model: PrismaModel): string {
  const lines: string[] = [];
  const scalarFields = getScalarFields(model).filter(
    (f) => !f.isId && !isTimestampField(f)
  );
  const relationFields = getRelationFields(model);
  const tableName = toCamelCase(model.name);
  const fileName = toKebabCase(model.name);

  // Imports
  lines.push("import {");
  lines.push("  PrismaBatchExecutor,");
  lines.push("  PrismaToPersistence,");
  lines.push('} from "@woltz/rich-domain-prisma";');
  lines.push(
    `import { ${model.name} } from "../../domain/entities/${fileName}.aggregate.js";`
  );
  lines.push(
    'import { AggregateChanges, EntitySchemaRegistry } from "@woltz/rich-domain";'
  );
  lines.push("");

  lines.push("/**");
  lines.push(` * Maps ${model.name} Domain Entity to Prisma operations`);
  lines.push(" */");
  lines.push(
    `export class ${model.name}ToPersistenceMapper extends PrismaToPersistence<${model.name}> {`
  );

  // Registry
  lines.push(
    "  protected readonly registry = new EntitySchemaRegistry().register({"
  );
  lines.push(`    entity: "${model.name}",`);
  lines.push(`    table: "${tableName}",`);

  // Collections (relations)
  const listRelations = relationFields.filter((f) => f.isList);
  if (listRelations.length > 0) {
    lines.push("    collections: {");
    for (const field of listRelations) {
      // Determine relation type: "entity" (owned, has FK) or "reference" (N:N)
      const isReference = !field.relationFromFields?.length;
      const relationType = isReference ? "reference" : "entity";
      lines.push(
        `      ${field.name}: { type: "${relationType}", entity: "${field.type}" },`
      );
    }
    lines.push("    },");
  }

  lines.push("  });");
  lines.push("");

  // onCreate method
  lines.push(`  protected async onCreate(entity: ${model.name}) {`);
  lines.push(`    await this.context.${tableName}.create({`);
  lines.push("      data: {");
  lines.push("        id: entity.id.value,");

  for (const field of scalarFields) {
    lines.push(`        ${field.name}: entity.${field.name},`);
  }

  lines.push("      },");
  lines.push("    });");
  lines.push("  }");
  lines.push("");

  // onUpdate method
  lines.push(`  protected async onUpdate(`);
  lines.push(`    entity: ${model.name},`);
  lines.push("    changes: AggregateChanges");
  lines.push("  ): Promise<void> {");
  lines.push("    const executor = new PrismaBatchExecutor(this.context, {");
  lines.push("      registry: this.registry,");
  lines.push("      rootId: entity.id.value,");
  lines.push("    });");
  lines.push("");
  lines.push("    await executor.execute(changes);");
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Implementation (infra/repository)
// ─────────────────────────────────────────────────────────────────────────────

function generateRepositoryImplementation(model: PrismaModel): string {
  const lines: string[] = [];
  const tableName = toCamelCase(model.name);
  const fileName = toKebabCase(model.name);

  lines.push(
    'import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";'
  );
  lines.push(`import type { Prisma, PrismaClient } from "@prisma/client";`);
  lines.push(
    `import { ${model.name} } from "../../domain/entities/${fileName}.aggregate.js";`
  );
  lines.push(
    `import type { I${model.name}Repository } from "../../domain/repository/${fileName}.repository.js";`
  );
  lines.push(
    `import { Prisma${model.name}WithRelations } from "../schemas/${fileName}.schema.js";`
  );
  lines.push(
    `import { ${model.name}ToDomainMapper } from "../mappers/${fileName}-to-domain.mapper.js";`
  );
  lines.push(
    `import { ${model.name}ToPersistenceMapper } from "../mappers/${fileName}-to-persistence.mapper.js";`
  );
  lines.push("");

  lines.push("/**");
  lines.push(` * ${model.name} Repository Implementation`);
  lines.push(" */");
  lines.push(`export class ${model.name}Repository`);
  lines.push(
    `  extends PrismaRepository<${model.name}, Prisma${model.name}WithRelations>`
  );
  lines.push(`  implements I${model.name}Repository`);
  lines.push("{");
  lines.push(`  protected model = "${tableName}" as const;`);
  lines.push(
    `  protected includes = {} satisfies Prisma.${model.name}Include;`
  );
  lines.push("");

  // Constructor
  lines.push("  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {");
  lines.push("    super(");
  lines.push(`      new ${model.name}ToPersistenceMapper(prisma, uow),`);
  lines.push(`      new ${model.name}ToDomainMapper(),`);
  lines.push("      prisma,");
  lines.push("      uow");
  lines.push("    );");
  lines.push("  }");
  lines.push("");

  // generateSearchQuery method
  lines.push("  /**");
  lines.push("   * Generate search query for filtering");
  lines.push("   * TODO: Implement your search logic");
  lines.push("   */");
  lines.push(
    `  generateSearchQuery(search: string): Prisma.${model.name}WhereInput[] {`
  );
  lines.push(`    return [] satisfies Prisma.${model.name}WhereInput[];`);
  lines.push("  }");

  lines.push("}");

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getTypeScriptType(field: PrismaField): string {
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
