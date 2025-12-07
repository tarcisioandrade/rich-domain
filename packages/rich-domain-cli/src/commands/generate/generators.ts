import type { PrismaModel, PrismaField, PrismaEnum } from "./prisma-parser.js";
import {
  getScalarFields,
  getRelationFields,
  isTimestampField,
  isForeignKey,
  prismaTypeToZod,
  prismaTypeToValibot,
  prismaTypeToArktype,
  toKebabCase,
  toCamelCase,
} from "./prisma-parser.js";
import type { DependencyAnalysis } from "./dependency-graph.js";

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
  analysis: DependencyAnalysis,
  options: GenerateOptions
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const node = analysis.nodes.get(model.name);
  const isAggregate = node?.isAggregate ?? true;
  const folderName = toKebabCase(model.name);

  // Generate schema
  files.push({
    path: `${
      options.outputDir
    }/${folderName}/${model.name.toLowerCase()}.schema.ts`,
    content: generateSchema(model, analysis, options),
  });

  // Generate entity/aggregate
  files.push({
    path: `${options.outputDir}/${folderName}/${model.name.toLowerCase()}.${
      isAggregate ? "aggregate" : "entity"
    }.ts`,
    content: isAggregate
      ? generateAggregate(model, options)
      : generateEntity(model, options),
  });

  // Generate repository and mappers only if rich-domain-prisma is installed
  if (isAggregate && options.generatePrismaFiles) {
    files.push({
      path: `${
        options.outputDir
      }/${folderName}/${model.name.toLowerCase()}.repository.ts`,
      content: generateRepository(model),
    });

    files.push({
      path: `${
        options.outputDir
      }/${folderName}/${model.name.toLowerCase()}-to-domain.mapper.ts`,
      content: generateToDomainMapper(model, analysis),
    });

    files.push({
      path: `${
        options.outputDir
      }/${folderName}/${model.name.toLowerCase()}-to-persistence.mapper.ts`,
      content: generateToPersistenceMapper(model),
    });
  }

  // Generate index
  files.push({
    path: `${options.outputDir}/${folderName}/index.ts`,
    content: generateIndex(model, isAggregate, options.generatePrismaFiles),
  });

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
    " * Auto-generated from Prisma schema",
    " * @see prisma/schema.prisma",
    " */",
    "",
  ];

  for (const enumDef of enums) {
    if (enumDef.documentation) {
      lines.push(`/** ${enumDef.documentation} */`);
    }

    lines.push(`export const ${enumDef.name} = {`);
    for (const value of enumDef.values) {
      lines.push(`  ${value}: "${value}",`);
    }
    lines.push("} as const;");
    lines.push("");
    lines.push(
      `export type ${enumDef.name} = (typeof ${enumDef.name})[keyof typeof ${enumDef.name}];`
    );
    lines.push("");
  }

  return {
    path: `${options.outputDir}/shared/enums.ts`,
    content: lines.join("\n"),
  };
}

/**
 * Generate schema file for a model (supports zod, valibot, arktype, or none)
 */
function generateSchema(
  model: PrismaModel,
  analysis: DependencyAnalysis,
  options: GenerateOptions
): string {
  switch (options.validation) {
    case "zod":
      return generateZodSchema(model, analysis);
    case "valibot":
      return generateValibotSchema(model, analysis);
    case "arktype":
      return generateArktypeSchema(model, analysis);
    case "none":
      return generateInterfaceOnly(model, analysis);
    default:
      return generateInterfaceOnly(model, analysis);
  }
}

/**
 * Generate Zod schema
 */
function generateZodSchema(
  model: PrismaModel,
  analysis: DependencyAnalysis
): string {
  const lines: string[] = [];
  const enumImports = new Set<string>();
  const entityImports = new Set<string>();

  const scalarFields = getScalarFields(model);
  const relationFields = getRelationFields(model);

  // Collect enum imports
  for (const field of scalarFields) {
    if (field.kind === "enum") {
      enumImports.add(field.type);
    }
  }

  // Collect relation imports
  for (const field of relationFields) {
    if (analysis.nodes.has(field.type)) {
      entityImports.add(field.type);
    }
  }

  // Add imports
  lines.push('import { z } from "zod";');
  lines.push('import { Id } from "@woltz/rich-domain";');

  if (enumImports.size > 0) {
    lines.push(
      `import { ${Array.from(enumImports).join(
        ", "
      )} } from "../shared/enums.js";`
    );
  }

  for (const entityName of entityImports) {
    const folder = toKebabCase(entityName);
    lines.push(`import { ${entityName} } from "../${folder}/index.js";`);
  }

  lines.push("");
  lines.push("/**");
  lines.push(" * Auto-generated from Prisma schema");
  if (model.documentation) {
    lines.push(` * ${model.documentation}`);
  }
  lines.push(" */");
  lines.push(`export const ${toCamelCase(model.name)}Schema = z.object({`);

  // ID field
  lines.push("  id: z.instanceof(Id),");

  // Scalar fields (excluding id)
  for (const field of scalarFields) {
    if (field.isId) continue;
    const zodType = prismaTypeToZod(field);
    lines.push(`  ${field.name}: ${zodType},`);
  }

  // Relation fields
  for (const field of relationFields) {
    let zodType: string;
    if (field.isList) {
      zodType = `z.array(z.instanceof(${field.type}))`;
    } else if (!field.isRequired) {
      zodType = `z.instanceof(${field.type}).nullable()`;
    } else {
      zodType = `z.instanceof(${field.type})`;
    }
    lines.push(`  ${field.name}: ${zodType},`);
  }

  lines.push("});");
  lines.push("");
  lines.push(
    `export type ${model.name}Props = z.infer<typeof ${toCamelCase(
      model.name
    )}Schema>;`
  );

  return lines.join("\n");
}

/**
 * Generate Valibot schema
 */
function generateValibotSchema(
  model: PrismaModel,
  analysis: DependencyAnalysis
): string {
  const lines: string[] = [];
  const enumImports = new Set<string>();
  const entityImports = new Set<string>();

  const scalarFields = getScalarFields(model);
  const relationFields = getRelationFields(model);

  // Collect imports
  for (const field of scalarFields) {
    if (field.kind === "enum") {
      enumImports.add(field.type);
    }
  }

  for (const field of relationFields) {
    if (analysis.nodes.has(field.type)) {
      entityImports.add(field.type);
    }
  }

  // Add imports
  lines.push('import * as v from "valibot";');
  lines.push('import { Id } from "@woltz/rich-domain";');

  if (enumImports.size > 0) {
    lines.push(
      `import { ${Array.from(enumImports).join(
        ", "
      )} } from "../shared/enums.js";`
    );
  }

  for (const entityName of entityImports) {
    const folder = toKebabCase(entityName);
    lines.push(`import { ${entityName} } from "../${folder}/index.js";`);
  }

  lines.push("");
  lines.push("/**");
  lines.push(" * Auto-generated from Prisma schema");
  if (model.documentation) {
    lines.push(` * ${model.documentation}`);
  }
  lines.push(" */");
  lines.push(`export const ${toCamelCase(model.name)}Schema = v.object({`);

  // ID field
  lines.push("  id: v.instance(Id),");

  // Scalar fields
  for (const field of scalarFields) {
    if (field.isId) continue;
    const valibotType = prismaTypeToValibot(field);
    lines.push(`  ${field.name}: ${valibotType},`);
  }

  // Relation fields
  for (const field of relationFields) {
    let valibotType: string;
    if (field.isList) {
      valibotType = `v.array(v.instance(${field.type}))`;
    } else if (!field.isRequired) {
      valibotType = `v.nullable(v.instance(${field.type}))`;
    } else {
      valibotType = `v.instance(${field.type})`;
    }
    lines.push(`  ${field.name}: ${valibotType},`);
  }

  lines.push("});");
  lines.push("");
  lines.push(
    `export type ${model.name}Props = v.InferOutput<typeof ${toCamelCase(
      model.name
    )}Schema>;`
  );

  return lines.join("\n");
}

/**
 * Generate ArkType schema
 */
function generateArktypeSchema(
  model: PrismaModel,
  analysis: DependencyAnalysis
): string {
  const lines: string[] = [];
  const enumImports = new Set<string>();
  const entityImports = new Set<string>();

  const scalarFields = getScalarFields(model);
  const relationFields = getRelationFields(model);

  // Collect imports
  for (const field of scalarFields) {
    if (field.kind === "enum") {
      enumImports.add(field.type);
    }
  }

  for (const field of relationFields) {
    if (analysis.nodes.has(field.type)) {
      entityImports.add(field.type);
    }
  }

  // Add imports
  lines.push('import { type } from "arktype";');
  lines.push('import { Id } from "@woltz/rich-domain";');

  if (enumImports.size > 0) {
    lines.push(
      `import { ${Array.from(enumImports).join(
        ", "
      )} } from "../shared/enums.js";`
    );
  }

  for (const entityName of entityImports) {
    const folder = toKebabCase(entityName);
    lines.push(`import { ${entityName} } from "../${folder}/index.js";`);
  }

  lines.push("");
  lines.push("/**");
  lines.push(" * Auto-generated from Prisma schema");
  if (model.documentation) {
    lines.push(` * ${model.documentation}`);
  }
  lines.push(" */");
  lines.push(`export const ${toCamelCase(model.name)}Schema = type({`);

  // ID field
  lines.push("  id: type.instanceOf(Id),");

  // Scalar fields
  for (const field of scalarFields) {
    if (field.isId) continue;
    const arktypeType = prismaTypeToArktype(field);
    lines.push(`  ${field.name}: ${arktypeType},`);
  }

  // Relation fields
  for (const field of relationFields) {
    let arktypeType: string;
    if (field.isList) {
      arktypeType = `type.instanceOf(${field.type}).array()`;
    } else if (!field.isRequired) {
      arktypeType = `type.instanceOf(${field.type}).or(type("null"))`;
    } else {
      arktypeType = `type.instanceOf(${field.type})`;
    }
    lines.push(`  ${field.name}: ${arktypeType},`);
  }

  lines.push("});");
  lines.push("");
  lines.push(
    `export type ${model.name}Props = typeof ${toCamelCase(
      model.name
    )}Schema.infer;`
  );

  return lines.join("\n");
}

/**
 * Generate interface-only (no validation library)
 */
function generateInterfaceOnly(
  model: PrismaModel,
  analysis: DependencyAnalysis
): string {
  const lines: string[] = [];
  const enumImports = new Set<string>();
  const entityImports = new Set<string>();

  const scalarFields = getScalarFields(model);
  const relationFields = getRelationFields(model);

  // Collect imports
  for (const field of scalarFields) {
    if (field.kind === "enum") {
      enumImports.add(field.type);
    }
  }

  for (const field of relationFields) {
    if (analysis.nodes.has(field.type)) {
      entityImports.add(field.type);
    }
  }

  // Add imports
  lines.push('import { Id } from "@woltz/rich-domain";');

  if (enumImports.size > 0) {
    lines.push(
      `import { ${Array.from(enumImports).join(
        ", "
      )} } from "../shared/enums.js";`
    );
  }

  for (const entityName of entityImports) {
    const folder = toKebabCase(entityName);
    lines.push(`import type { ${entityName} } from "../${folder}/index.js";`);
  }

  lines.push("");
  lines.push("/**");
  lines.push(" * Auto-generated from Prisma schema");
  if (model.documentation) {
    lines.push(` * ${model.documentation}`);
  }
  lines.push(" */");
  lines.push(`export interface ${model.name}Props {`);

  // ID field
  lines.push("  id: Id;");

  // Scalar fields
  for (const field of scalarFields) {
    if (field.isId) continue;
    const tsType = getTypeScriptType(field);
    lines.push(`  ${field.name}: ${tsType};`);
  }

  // Relation fields
  for (const field of relationFields) {
    const tsType = field.isList
      ? `${field.type}[]`
      : field.isRequired
      ? field.type
      : `${field.type} | null`;
    lines.push(`  ${field.name}: ${tsType};`);
  }

  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate Aggregate class
 */
function generateAggregate(
  model: PrismaModel,
  options: GenerateOptions
): string {
  const lines: string[] = [];
  const schemaName = `${toCamelCase(model.name)}Schema`;

  const scalarFields = getScalarFields(model).filter((f) => !f.isId);
  const relationFields = getRelationFields(model);

  // Imports based on validation type
  lines.push('import { Aggregate, Id } from "@woltz/rich-domain";');

  if (options.validation === "zod") {
    lines.push(
      `import { ${schemaName}, type ${
        model.name
      }Props } from "./${model.name.toLowerCase()}.schema.js";`
    );
  } else if (options.validation === "valibot") {
    lines.push(
      `import { ${schemaName}, type ${
        model.name
      }Props } from "./${model.name.toLowerCase()}.schema.js";`
    );
  } else if (options.validation === "arktype") {
    lines.push(
      `import { ${schemaName}, type ${
        model.name
      }Props } from "./${model.name.toLowerCase()}.schema.js";`
    );
  } else {
    // No validation - import interface directly
    lines.push(
      `import type { ${
        model.name
      }Props } from "./${model.name.toLowerCase()}.schema.js";`
    );
  }

  // Import related entities
  const relatedImports = new Set<string>();
  for (const field of relationFields) {
    relatedImports.add(field.type);
  }
  for (const entityName of relatedImports) {
    const folder = toKebabCase(entityName);
    lines.push(`import { ${entityName} } from "../${folder}/index.js";`);
  }

  // Import enums
  const enumImports = scalarFields
    .filter((f) => f.kind === "enum")
    .map((f) => f.type);
  if (enumImports.length > 0) {
    lines.push(
      `import { ${[...new Set(enumImports)].join(
        ", "
      )} } from "../shared/enums.js";`
    );
  }

  lines.push("");

  // Class definition
  lines.push("/**");
  lines.push(" * Auto-generated from Prisma schema");
  lines.push(" * Add your domain logic and methods");
  if (model.documentation) {
    lines.push(` * ${model.documentation}`);
  }
  lines.push(" */");
  lines.push(
    `export class ${model.name} extends Aggregate<${model.name}Props> {`
  );

  // Add validation only if using a validation library
  if (options.validation !== "none") {
    lines.push("  protected static validation = {");
    lines.push(`    schema: ${schemaName},`);
    lines.push("  };");
    lines.push("");
  }

  // Getters
  lines.push(
    "  // ─────────────────────────────────────────────────────────────"
  );
  lines.push("  // Getters");
  lines.push(
    "  // ─────────────────────────────────────────────────────────────"
  );
  lines.push("");

  for (const field of scalarFields) {
    const tsType = getTypeScriptType(field);
    lines.push(`  get ${field.name}(): ${tsType} {`);
    lines.push(`    return this.props.${field.name};`);
    lines.push("  }");
    lines.push("");
  }

  for (const field of relationFields) {
    const tsType = field.isList
      ? `${field.type}[]`
      : field.isRequired
      ? field.type
      : `${field.type} | null`;
    lines.push(`  get ${field.name}(): ${tsType} {`);
    lines.push(`    return this.props.${field.name};`);
    lines.push("  }");
    lines.push("");
  }

  // Domain methods
  lines.push(
    "  // ─────────────────────────────────────────────────────────────"
  );
  lines.push("  // Domain Methods");
  lines.push(
    "  // ─────────────────────────────────────────────────────────────"
  );
  lines.push("");

  // Generate update methods for editable fields
  const editableFields = scalarFields.filter(
    (f) => !f.isId && !isTimestampField(f) && !f.isGenerated
  );

  for (const field of editableFields) {
    const methodName = `update${field.name
      .charAt(0)
      .toUpperCase()}${field.name.slice(1)}`;
    const tsType = getTypeScriptType(field);

    lines.push(`  ${methodName}(${field.name}: ${tsType}): void {`);
    lines.push(`    this.props.${field.name} = ${field.name};`);
    if (scalarFields.some((f) => f.name === "updatedAt")) {
      lines.push("    this.props.updatedAt = new Date();");
    }
    lines.push("  }");
    lines.push("");
  }

  // Generate relation methods
  if (relationFields.length > 0) {
    lines.push(
      "  // ─────────────────────────────────────────────────────────────"
    );
    lines.push("  // Relation Methods");
    lines.push(
      "  // ─────────────────────────────────────────────────────────────"
    );
    lines.push("");

    for (const field of relationFields) {
      if (field.isList) {
        // Add method
        const singularName = field.name.endsWith("s")
          ? field.name.slice(0, -1)
          : field.name;
        const addMethod = `add${singularName
          .charAt(0)
          .toUpperCase()}${singularName.slice(1)}`;
        const removeMethod = `remove${singularName
          .charAt(0)
          .toUpperCase()}${singularName.slice(1)}`;

        lines.push(`  ${addMethod}(${singularName}: ${field.type}): void {`);
        lines.push(`    this.props.${field.name}.push(${singularName});`);
        lines.push("  }");
        lines.push("");

        lines.push(`  ${removeMethod}(${singularName}Id: Id): void {`);
        lines.push(
          `    this.props.${field.name} = this.props.${field.name}.filter(`
        );
        lines.push(`      (item) => !item.id.equals(${singularName}Id)`);
        lines.push("    );");
        lines.push("  }");
        lines.push("");
      } else {
        // Set method
        const setMethod = `set${field.name
          .charAt(0)
          .toUpperCase()}${field.name.slice(1)}`;
        const paramType = field.isRequired
          ? field.type
          : `${field.type} | null`;

        lines.push(`  ${setMethod}(${field.name}: ${paramType}): void {`);
        lines.push(`    this.props.${field.name} = ${field.name};`);
        lines.push("  }");
        lines.push("");
      }
    }
  }

  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate Entity class (similar to Aggregate but simpler)
 */
function generateEntity(model: PrismaModel, options: GenerateOptions): string {
  // Similar to aggregate but extends Entity instead
  const content = generateAggregate(model, options);
  return content
    .replace("extends Aggregate", "extends Entity")
    .replace(
      'import { Aggregate, Id } from "@woltz/rich-domain";',
      'import { Entity, Id } from "@woltz/rich-domain";'
    );
}

/**
 * Generate repository class
 */
function generateRepository(model: PrismaModel): string {
  const lines: string[] = [];
  const relationFields = getRelationFields(model);

  lines.push('import { PrismaClient } from "@prisma/client";');
  lines.push(
    'import { PrismaRepository, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";'
  );
  lines.push(
    `import { ${
      model.name
    } } from "./${model.name.toLowerCase()}.aggregate.js";`
  );
  lines.push(
    `import { ${
      model.name
    }ToDomainMapper } from "./${model.name.toLowerCase()}-to-domain.mapper.js";`
  );
  lines.push(
    `import { ${
      model.name
    }ToPersistenceMapper } from "./${model.name.toLowerCase()}-to-persistence.mapper.js";`
  );
  lines.push("");

  lines.push("/**");
  lines.push(" * Auto-generated from Prisma schema");
  lines.push(" */");
  lines.push(
    `export class ${model.name}Repository extends PrismaRepository<${model.name}> {`
  );
  lines.push(
    `  protected readonly model = "${toCamelCase(model.name)}" as const;`
  );
  lines.push("");

  // Include relations
  if (relationFields.length > 0) {
    lines.push("  protected readonly includes = {");
    for (const field of relationFields) {
      lines.push(`    ${field.name}: true,`);
    }
    lines.push("  };");
    lines.push("");
  }

  lines.push("  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {");
  lines.push("    super(");
  lines.push(`      new ${model.name}ToPersistenceMapper(prisma, uow),`);
  lines.push(`      new ${model.name}ToDomainMapper(),`);
  lines.push("      prisma,");
  lines.push("      uow");
  lines.push("    );");
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate to-domain mapper
 */
function generateToDomainMapper(
  model: PrismaModel,
  analysis: DependencyAnalysis
): string {
  const lines: string[] = [];
  const scalarFields = getScalarFields(model);
  const relationFields = getRelationFields(model);

  lines.push('import { Mapper, Id } from "@woltz/rich-domain";');
  lines.push(
    `import { ${model.name} as Prisma${model.name} } from "@prisma/client";`
  );
  lines.push(
    `import { ${
      model.name
    } } from "./${model.name.toLowerCase()}.aggregate.js";`
  );

  // Import related entities
  for (const field of relationFields) {
    const folder = toKebabCase(field.type);
    lines.push(`import { ${field.type} } from "../${folder}/index.js";`);
  }

  lines.push("");

  // Type for Prisma result with relations
  if (relationFields.length > 0) {
    lines.push(
      `type Prisma${model.name}WithRelations = Prisma${model.name} & {`
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
    lines.push("");
  }

  const inputType =
    relationFields.length > 0
      ? `Prisma${model.name}WithRelations`
      : `Prisma${model.name}`;

  lines.push("/**");
  lines.push(" * Auto-generated from Prisma schema");
  lines.push(" * Maps Prisma result to Domain Entity");
  lines.push(" */");
  lines.push(
    `export class ${model.name}ToDomainMapper extends Mapper<${inputType}, ${model.name}> {`
  );
  lines.push(`  build(raw: ${inputType}): ${model.name} {`);
  lines.push(`    return new ${model.name}({`);
  lines.push("      id: Id.from(raw.id),");

  // Scalar fields
  for (const field of scalarFields) {
    if (field.isId) continue;
    lines.push(`      ${field.name}: raw.${field.name},`);
  }

  // Relation fields
  for (const field of relationFields) {
    if (field.isList) {
      lines.push(
        `      ${field.name}: raw.${field.name}?.map((item) => this.map${field.type}(item)) ?? [],`
      );
    } else if (field.isRequired) {
      lines.push(
        `      ${field.name}: raw.${field.name} ? this.map${field.type}(raw.${field.name}) : null,`
      );
    } else {
      lines.push(
        `      ${field.name}: raw.${field.name} ? this.map${field.type}(raw.${field.name}) : null,`
      );
    }
  }

  lines.push("    });");
  lines.push("  }");

  // Private mappers for relations
  for (const field of relationFields) {
    const relatedModel = analysis.nodes.get(field.type)?.model;
    if (!relatedModel) continue;

    const relatedScalarFields = getScalarFields(relatedModel);

    lines.push("");
    lines.push(
      `  private map${field.type}(raw: Prisma${field.type}): ${field.type} {`
    );
    lines.push(`    return new ${field.type}({`);
    lines.push("      id: Id.from(raw.id),");

    for (const f of relatedScalarFields) {
      if (f.isId) continue;
      lines.push(`      ${f.name}: raw.${f.name},`);
    }

    // Empty arrays for nested relations
    const nestedRelations = getRelationFields(relatedModel);
    for (const nested of nestedRelations) {
      if (nested.isList) {
        lines.push(`      ${nested.name}: [],`);
      } else {
        lines.push(`      ${nested.name}: null,`);
      }
    }

    lines.push("    });");
    lines.push("  }");
  }

  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate to-persistence mapper
 */
function generateToPersistenceMapper(model: PrismaModel): string {
  const lines: string[] = [];
  const scalarFields = getScalarFields(model).filter((f) => !f.isId);
  const relationFields = getRelationFields(model);

  lines.push('import { PrismaClient } from "@prisma/client";');
  lines.push(
    'import { PrismaToPersistence, PrismaUnitOfWork } from "@woltz/rich-domain-prisma";'
  );
  lines.push(
    `import { ${
      model.name
    } } from "./${model.name.toLowerCase()}.aggregate.js";`
  );
  lines.push("");

  lines.push("/**");
  lines.push(" * Auto-generated from Prisma schema");
  lines.push(" * Maps Domain Entity to Prisma operations with change tracking");
  lines.push(" */");
  lines.push(
    `export class ${model.name}ToPersistenceMapper extends PrismaToPersistence<${model.name}> {`
  );
  lines.push("  constructor(prisma: PrismaClient, uow: PrismaUnitOfWork) {");
  lines.push("    super(prisma, uow, {");

  // Configure relations
  for (const field of relationFields) {
    const modelName = toCamelCase(field.type);
    lines.push(
      `      ${field.name}: { type: "entity", model: "${modelName}" },`
    );
  }

  lines.push("    });");
  lines.push("  }");
  lines.push("");

  // toPrismaCreate
  lines.push(`  protected toPrismaCreate(entity: ${model.name}) {`);
  lines.push("    return {");
  lines.push("      id: entity.id.value,");

  for (const field of scalarFields) {
    if (isForeignKey(field, model)) {
      // Convert Id to string for FK
      const baseName = field.name.slice(0, -2);
      lines.push(
        `      ${field.name}: entity.${baseName}?.id.value ?? entity.props.${field.name}?.value,`
      );
    } else {
      lines.push(`      ${field.name}: entity.${field.name},`);
    }
  }

  lines.push("    };");
  lines.push("  }");
  lines.push("");

  // toPrismaUpdate
  lines.push(`  protected toPrismaUpdate(entity: ${model.name}) {`);
  lines.push("    return {");

  for (const field of scalarFields) {
    if (isTimestampField(field) && field.name === "createdAt") continue;

    if (field.name === "updatedAt") {
      lines.push("      updatedAt: new Date(),");
    } else if (isForeignKey(field, model)) {
      const baseName = field.name.slice(0, -2);
      lines.push(
        `      ${field.name}: entity.${baseName}?.id.value ?? entity.props.${field.name}?.value,`
      );
    } else {
      lines.push(`      ${field.name}: entity.${field.name},`);
    }
  }

  lines.push("    };");
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate index file for a model
 */
function generateIndex(
  model: PrismaModel,
  isAggregate: boolean,
  generatePrismaFiles: boolean
): string {
  const baseName = model.name.toLowerCase();
  const entityFile = isAggregate ? "aggregate" : "entity";

  const lines = [
    `export * from "./${baseName}.schema.js";`,
    `export * from "./${baseName}.${entityFile}.js";`,
  ];

  if (isAggregate && generatePrismaFiles) {
    lines.push(`export * from "./${baseName}.repository.js";`);
    lines.push(`export * from "./${baseName}-to-domain.mapper.js";`);
    lines.push(`export * from "./${baseName}-to-persistence.mapper.js";`);
  }

  return lines.join("\n");
}

/**
 * Get TypeScript type for a field
 */
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

  let baseType: string;

  if (field.kind === "enum") {
    baseType = field.type;
  } else if (field.kind === "object") {
    baseType = field.type;
  } else {
    baseType = typeMap[field.type] ?? "unknown";
  }

  if (field.isList) {
    baseType = `${baseType}[]`;
  }

  if (!field.isRequired) {
    baseType = `${baseType} | null`;
  }

  return baseType;
}
