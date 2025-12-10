import ora from "ora";
import prompts from "prompts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { logger, code, path as pathStyle } from "../../utils/logger.js";
import { resolvePath, writeFile, fileExists } from "../../utils/fs.js";
import { parseProps, ParsedProp } from "./props-parser.js";
import {
  generateEntityFile,
  generateRepositoryInterface,
  generateRepositoryImpl,
  generateToDomainMapper,
  generateToPersistenceMapper,
  EntityType,
  ValidationLib,
} from "./generators.js";

export interface AddCommandOptions {
  aggregate?: boolean;
  entity?: boolean;
  valueObject?: boolean;
  withRepo?: boolean;
  withMapper?: boolean;
  withAll?: boolean;
  output?: string;
  force?: boolean;
}

/**
 * Convert name to different cases
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Detect validation library from package.json
 */
function detectValidationLib(): ValidationLib {
  try {
    const packageJsonPath = resolvePath("package.json");
    if (!fileExists(packageJsonPath)) {
      return "none";
    }

    const content = readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    if ("zod" in deps) return "zod";
    if ("valibot" in deps) return "valibot";
    if ("arktype" in deps) return "arktype";

    return "none";
  } catch {
    return "none";
  }
}

/**
 * Detect if @woltz/rich-domain-prisma is installed
 */
function detectPrisma(): boolean {
  try {
    const packageJsonPath = resolvePath("package.json");
    if (!fileExists(packageJsonPath)) {
      return false;
    }

    const content = readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    return "@woltz/rich-domain-prisma" in deps;
  } catch {
    return false;
  }
}

/**
 * Detect output directory by looking for existing structure
 */
function detectOutputDir(): string {
  const possiblePaths = ["src", "src/domain", "domain", "lib"];

  for (const p of possiblePaths) {
    const entitiesPath = join(p, "domain", "entities");
    const altPath = join(p, "entities");

    if (existsSync(resolvePath(entitiesPath))) {
      // Found src/domain/entities structure, return parent (src)
      return p === "src/domain" ? "src" : p;
    }

    if (existsSync(resolvePath(altPath)) && p !== "src") {
      return p;
    }
  }

  // Check if src/domain exists
  if (existsSync(resolvePath("src/domain"))) {
    return "src";
  }

  // Check if src exists
  if (existsSync(resolvePath("src"))) {
    return "src";
  }

  // Default
  return "src";
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
 * Main add command execution
 */
export async function addEntity(
  name: string,
  propsArgs: string[],
  options: AddCommandOptions
): Promise<void> {
  logger.box(["➕ Rich Domain Add", "", `Creating ${name}...`]);
  logger.newLine();

  // Determine entity type
  let entityType: EntityType = "aggregate"; // default

  if (options.valueObject) {
    entityType = "value-object";
  } else if (options.entity) {
    entityType = "entity";
  } else if (options.aggregate) {
    entityType = "aggregate";
  }

  // Parse props
  let props: ParsedProp[] = [];

  if (propsArgs.length > 0) {
    try {
      props = parseProps(propsArgs);
    } catch (error) {
      logger.error(
        `Invalid props: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      process.exit(1);
    }
  }

  // Detect validation library
  const validation = detectValidationLib();

  // Detect if Prisma adapter is installed
  const hasPrisma = detectPrisma();

  // Detect or use provided output directory
  const outputDir = options.output || detectOutputDir();

  // Determine what to generate
  const withRepo = options.withRepo || options.withAll || false;
  const withMapper = options.withMapper || options.withAll || false;

  // Determine if user provided explicit output path
  const isExplicitOutput = !!options.output;

  // Show summary
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);
  const suffix = getFileSuffix(entityType);

  logger.info("Configuration:");
  logger.listItem(`Name: ${code(pascalName)}`);
  logger.listItem(`Type: ${code(entityType)}`);
  logger.listItem(`Validation: ${code(validation)}`);
  logger.listItem(`Output: ${pathStyle(outputDir)}`);
  logger.listItem(
    `Props: ${
      props.length > 0 ? props.map((p) => code(p.name)).join(", ") : "none"
    }`
  );
  if (withRepo || withMapper) {
    logger.listItem(
      `Prisma adapter: ${
        hasPrisma ? code("yes") : code("no (generic implementation)")
      }`
    );
  }
  logger.newLine();

  // Files to generate
  interface FileToGenerate {
    path: string;
    content: string;
    description: string;
  }

  const files: FileToGenerate[] = [];

  // Entity file path depends on whether output was explicit
  const entityPath = isExplicitOutput
    ? `${outputDir}/${kebabName}.${suffix}.ts`
    : `${outputDir}/domain/entities/${kebabName}.${suffix}.ts`;

  files.push({
    path: entityPath,
    content: generateEntityFile({
      name,
      type: entityType,
      props,
      validation,
    }),
    description: `${pascalName} ${entityType}`,
  });

  // Repository interface
  if (withRepo && entityType !== "value-object") {
    const repoInterfacePath = isExplicitOutput
      ? `${outputDir}/${kebabName}.repository.ts`
      : `${outputDir}/domain/repository/${kebabName}.repository.ts`;

    const repoImplPath = isExplicitOutput
      ? `${outputDir}/${kebabName}.repository.impl.ts`
      : `${outputDir}/infra/repository/${kebabName}.repository.ts`;

    files.push({
      path: repoInterfacePath,
      content: generateRepositoryInterface(name, entityType),
      description: `${pascalName} repository interface`,
    });

    files.push({
      path: repoImplPath,
      content: generateRepositoryImpl(name, entityType, hasPrisma),
      description: `${pascalName} repository implementation`,
    });
  }

  // Mappers
  if (withMapper && entityType !== "value-object") {
    const toDomainPath = isExplicitOutput
      ? `${outputDir}/${kebabName}-to-domain.mapper.ts`
      : `${outputDir}/infra/mappers/${kebabName}-to-domain.mapper.ts`;

    const toPersistencePath = isExplicitOutput
      ? `${outputDir}/${kebabName}-to-persistence.mapper.ts`
      : `${outputDir}/infra/mappers/${kebabName}-to-persistence.mapper.ts`;

    files.push({
      path: toDomainPath,
      content: generateToDomainMapper(name, entityType, props),
      description: `${pascalName} ToDomain mapper`,
    });

    files.push({
      path: toPersistencePath,
      content: generateToPersistenceMapper(name, entityType, hasPrisma),
      description: `${pascalName} ToPersistence mapper`,
    });
  }

  // Show files to be created
  logger.info("Files to create:");
  for (const file of files) {
    const exists = fileExists(resolvePath(file.path));
    if (exists) {
      logger.listItem(`${pathStyle(file.path)} (exists)`);
    } else {
      logger.listItem(pathStyle(file.path));
    }
  }
  logger.newLine();

  // Check for existing files
  const existingFiles = files.filter((f) => fileExists(resolvePath(f.path)));

  if (existingFiles.length > 0 && !options.force) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `${existingFiles.length} file(s) already exist. Overwrite?`,
      initial: false,
    });

    if (!overwrite) {
      logger.info("Aborted");
      process.exit(0);
    }
  }

  // Confirm
  if (!options.force) {
    const { confirm } = await prompts({
      type: "confirm",
      name: "confirm",
      message: `Create ${files.length} file(s)?`,
      initial: true,
    });

    if (!confirm) {
      logger.info("Aborted");
      process.exit(0);
    }
  }

  // Generate files
  logger.newLine();
  const spinner = ora("Creating files...").start();

  try {
    for (const file of files) {
      writeFile(resolvePath(file.path), file.content);
    }

    spinner.succeed(`Created ${files.length} file(s)`);

    // Show created files
    logger.newLine();
    for (const file of files) {
      logger.file("created", file.path);
    }

    // Show next steps
    logger.newLine();
    logger.info("Next steps:");
    logger.listItem(`Edit ${pathStyle(files[0].path)} to add domain logic`);

    if (props.some((p) => p.type === "relation")) {
      logger.listItem("Import related entities for relation types");
    }

    if (withMapper) {
      logger.listItem("Complete the mapper implementations with your fields");
    }

    if (isExplicitOutput && (withRepo || withMapper)) {
      logger.listItem(
        "Adjust import paths in generated files to match your project structure"
      );
    }

    if (entityType !== "value-object" && !withRepo) {
      logger.listItem(`Add ${code("--with-repo")} to also generate repository`);
    }
  } catch (error) {
    spinner.fail("Failed to create files");
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export { addEntity as execute };
