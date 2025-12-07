import ora from "ora";
import prompts from "prompts";
import { readFileSync } from "node:fs";
import { logger, code, path as pathStyle } from "../../utils/logger.js";
import {
  findPrismaSchema,
  resolvePath,
  writeFile,
  fileExists,
  relativePath,
} from "../../utils/fs.js";
import { parsePrismaSchema } from "./prisma-parser.js";
import { analyzeDependencies, getGenerationOrder } from "./dependency-graph.js";
import { generateModelFiles, generateEnumsFile } from "./generators.js";
import type { GenerateOptions } from "./generators.js";

/**
 * CLI options for generate command
 */
export interface GenerateCommandOptions {
  schema?: string;
  output?: string;
  validation?: "zod" | "valibot" | "arktype";
  models?: string;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Detect installed packages relevant to generation
 */
interface DetectedPackages {
  richDomainPrisma: boolean;
  zod: boolean;
  valibot: boolean;
  arktype: boolean;
}

function detectPackages(): DetectedPackages {
  const defaultResult: DetectedPackages = {
    richDomainPrisma: false,
    zod: false,
    valibot: false,
    arktype: false,
  };

  try {
    const packageJsonPath = resolvePath("package.json");

    if (!fileExists(packageJsonPath)) {
      return defaultResult;
    }

    const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    const allDeps: Record<string, string> = {
      ...deps,
      ...devDeps,
    };

    const result = {
      richDomainPrisma: "@woltz/rich-domain-prisma" in allDeps,
      zod: "zod" in allDeps,
      valibot: "valibot" in allDeps,
      arktype: "arktype" in allDeps,
    };

    return result;
  } catch (error) {
    logger.warn(`Could not read package.json: ${error}`);
    return defaultResult;
  }
}

/**
 * Execute the generate command
 */
export async function generateFromPrisma(
  options: GenerateCommandOptions
): Promise<void> {
  logger.header("🔍 Rich Domain Generator");

  // Detect installed packages
  const packages = detectPackages();

  // Find or validate schema path
  let schemaPath = options.schema
    ? resolvePath(options.schema)
    : findPrismaSchema();

  if (!schemaPath) {
    const response = await prompts({
      type: "text",
      name: "schemaPath",
      message: "Prisma schema path:",
      initial: "prisma/schema.prisma",
    });

    if (!response.schemaPath) {
      logger.error("Schema path is required");
      process.exit(1);
    }

    schemaPath = resolvePath(response.schemaPath);
  }

  if (!fileExists(schemaPath)) {
    logger.error(`Schema not found: ${pathStyle(schemaPath)}`);
    process.exit(1);
  }

  logger.info(`Reading schema from ${pathStyle(relativePath(schemaPath))}`);

  // Show detected packages
  logger.newLine();
  logger.info("Detected packages:");
  logger.listItem(
    `@woltz/rich-domain-prisma: ${
      packages.richDomainPrisma ? code("✓ installed") : "✗ not installed"
    }`
  );

  // Determine validation library
  let validation: "zod" | "valibot" | "arktype" | "none" =
    options.validation as any;
  if (!validation) {
    if (packages.zod) validation = "zod";
    else if (packages.valibot) validation = "valibot";
    else if (packages.arktype) validation = "arktype";
    else validation = "none";
  }

  logger.listItem(
    `Validation library: ${
      validation === "none" ? code("none (interface only)") : code(validation)
    }`
  );

  // Warn if rich-domain-prisma is not installed
  if (!packages.richDomainPrisma) {
    logger.newLine();
    logger.warn(
      "Repository and mapper files will NOT be generated (requires @woltz/rich-domain-prisma)"
    );
    logger.dim("  Install it with: npm install @woltz/rich-domain-prisma");
  }

  // Warn if no validation library
  if (validation === "none") {
    logger.newLine();
    logger.warn(
      "No validation library detected - generating TypeScript interfaces only"
    );
    logger.dim("  For runtime validation, install: npm install zod");
  }

  // Parse schema
  const spinner = ora("Parsing Prisma schema...").start();

  let parsedSchema;
  try {
    parsedSchema = await parsePrismaSchema(schemaPath);
    spinner.succeed("Schema parsed successfully");
  } catch (error) {
    spinner.fail("Failed to parse schema");
    logger.error(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
    process.exit(1);
  }

  const { models, enums } = parsedSchema;

  // Filter models if specified
  let selectedModels = models;
  if (options.models) {
    const modelNames = options.models.split(",").map((m) => m.trim());
    selectedModels = models.filter((m) => modelNames.includes(m.name));

    if (selectedModels.length === 0) {
      logger.error(`No models found matching: ${options.models}`);
      logger.info(`Available models: ${models.map((m) => m.name).join(", ")}`);
      process.exit(1);
    }
  }

  // Show summary
  logger.newLine();
  logger.info(
    `Found ${logger.count(selectedModels.length, "model")} and ${logger.count(
      enums.length,
      "enum"
    )}`
  );
  logger.newLine();

  for (const model of selectedModels) {
    const fieldCount = model.fields.length;
    const relationCount = model.fields.filter(
      (f) => f.kind === "object"
    ).length;
    logger.listItem(
      `${code(model.name)} (${fieldCount} fields, ${relationCount} relations)`
    );
  }

  if (enums.length > 0) {
    logger.newLine();
    for (const e of enums) {
      logger.listItem(`${code(e.name)} (${e.values.length} values)`);
    }
  }

  // Analyze dependencies
  logger.newLine();
  const depSpinner = ora("Analyzing dependencies...").start();

  const analysis = analyzeDependencies(selectedModels);

  if (analysis.hasCycles) {
    depSpinner.warn("Circular dependencies detected");
    for (const cycle of analysis.cycles) {
      logger.warn(`  Cycle: ${cycle.join(" → ")}`);
    }
    logger.dim("  Files will be generated with forward references");
  } else {
    depSpinner.succeed("Dependencies analyzed");
  }

  logger.newLine();
  logger.info("Classification:");
  logger.listItem(
    `Aggregates: ${analysis.aggregates.map(code).join(", ") || "none"}`
  );
  logger.listItem(
    `Entities: ${analysis.entities.map(code).join(", ") || "none"}`
  );

  // Get output directory
  const outputDir = options.output
    ? resolvePath(options.output)
    : resolvePath("src/domain");

  // Confirm before generating
  if (!options.force && !options.dryRun) {
    logger.newLine();
    const confirm = await prompts({
      type: "confirm",
      name: "proceed",
      message: `Generate files in ${pathStyle(relativePath(outputDir))}?`,
      initial: true,
    });

    if (!confirm.proceed) {
      logger.info("Aborted");
      process.exit(0);
    }
  }

  // Generate options
  const genOptions: GenerateOptions = {
    validation: validation,
    outputDir,
    generatePrismaFiles: packages.richDomainPrisma,
  };

  // Generate files
  logger.newLine();
  const genSpinner = ora("Generating files...").start();

  const generatedFiles: { path: string; content: string }[] = [];

  // Generate enums file
  if (enums.length > 0) {
    const enumsFile = generateEnumsFile(enums, genOptions);
    generatedFiles.push(enumsFile);
  }

  // Generate model files in dependency order
  const orderedModels = getGenerationOrder(analysis);

  for (const model of orderedModels) {
    const files = generateModelFiles(model, analysis, genOptions);
    generatedFiles.push(...files);
  }

  genSpinner.succeed(`Generated ${generatedFiles.length} files`);

  // Write files or show dry run
  logger.newLine();

  if (options.dryRun) {
    logger.info("Dry run - files that would be created:");
    logger.newLine();

    for (const file of generatedFiles) {
      logger.file("created", relativePath(file.path));
    }
  } else {
    logger.info("Writing files:");
    logger.newLine();

    for (const file of generatedFiles) {
      writeFile(file.path, file.content);
      logger.file("created", relativePath(file.path));
    }
  }

  if (options.dryRun) return;

  // Show next steps
  logger.newLine();
  logger.box([
    "✨ Generation complete!",
    "",
    "Next steps:",
    "  1. Review generated entities and adjust business logic",
    "  2. Add domain methods to your aggregates",
    "  3. Customize validation rules in schema files",
  ]);
}

/**
 * Export command configuration
 */
export { generateFromPrisma as execute };
