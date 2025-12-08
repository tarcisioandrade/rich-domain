import ora from "ora";
import prompts from "prompts";
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { logger, code, path as pathStyle } from "../../utils/logger.js";
import { templateRegistry, TemplateOptions } from "./templates/index.js";

interface InitOptions {
  template?: string;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  force?: boolean;
}

/**
 * Initialize a new project from a template
 */
export async function initProject(
  targetDir: string,
  options: InitOptions
): Promise<void> {
  logger.box([
    "🚀 Rich Domain Project Initializer",
    "",
    "Create a new DDD project with best practices",
  ]);
  logger.newLine();

  // Resolve target directory
  const isCurrentDir = targetDir === ".";
  const absoluteTargetDir = resolve(process.cwd(), targetDir);
  const projectName = isCurrentDir
    ? resolve(process.cwd()).split("/").pop() || "my-app"
    : targetDir;

  // Check if directory exists and is not empty
  if (existsSync(absoluteTargetDir) && !isCurrentDir) {
    const files = readdirSync(absoluteTargetDir);
    if (files.length > 0 && !options.force) {
      const { overwrite } = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `Directory ${pathStyle(
          targetDir
        )} is not empty. Continue anyway?`,
        initial: false,
      });

      if (!overwrite) {
        logger.info("Aborted");
        process.exit(0);
      }
    }
  }

  // Select template
  let templateName = options.template;

  if (!templateName) {
    const templates = templateRegistry.getAllMetadata();

    const { selected } = await prompts({
      type: "select",
      name: "selected",
      message: "Select a template:",
      choices: templates.map((t) => ({
        title: t.name,
        description: t.description,
        value: t.name,
      })),
    });

    if (!selected) {
      logger.info("Aborted");
      process.exit(0);
    }

    templateName = selected;
  }

  const template = templateRegistry.get(templateName!);

  if (!template) {
    logger.error(`Template "${templateName}" not found`);
    logger.newLine();
    logger.info("Available templates:");
    for (const t of templateRegistry.getAllMetadata()) {
      logger.info(`  • ${code(t.name)} - ${t.description}`);
    }
    process.exit(1);
  }

  // Select package manager
  let packageManager = options.packageManager;

  if (!packageManager) {
    const { pm } = await prompts({
      type: "select",
      name: "pm",
      message: "Select package manager:",
      choices: [
        { title: "npm", value: "npm" },
        { title: "pnpm", value: "pnpm" },
        { title: "yarn", value: "yarn" },
        { title: "bun", value: "bun" },
      ],
      initial: 0,
    });

    if (!pm) {
      logger.info("Aborted");
      process.exit(0);
    }

    packageManager = pm;
  }

  // Confirm
  logger.newLine();
  logger.info("Project configuration:");
  logger.info(`  • Name: ${code(projectName)}`);
  logger.info(`  • Template: ${code(template.metadata.name)}`);
  logger.info(`  • Package manager: ${code(packageManager!)}`);
  logger.info(`  • Directory: ${pathStyle(absoluteTargetDir)}`);
  logger.newLine();

  if (!options.force) {
    const { confirm } = await prompts({
      type: "confirm",
      name: "confirm",
      message: "Create project?",
      initial: true,
    });

    if (!confirm) {
      logger.info("Aborted");
      process.exit(0);
    }
  }

  // Generate files
  logger.newLine();
  const spinner = ora("Generating project files...").start();

  const templateOptions: TemplateOptions = {
    projectName,
    targetDir: absoluteTargetDir,
    packageManager: packageManager!,
  };

  try {
    const files = await template.generate(templateOptions);

    // Create target directory
    if (!existsSync(absoluteTargetDir)) {
      mkdirSync(absoluteTargetDir, { recursive: true });
    }

    // Write files
    for (const file of files) {
      const filePath = join(absoluteTargetDir, file.path);
      const dir = dirname(filePath);
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filePath, file.content);
    }

    spinner.succeed(`Generated ${files.length} files`);

    // Show created files
    logger.newLine();
    logger.info("Created files:");
    for (const file of files.slice(0, 10)) {
      logger.file("created", file.path);
    }
    if (files.length > 10) {
      logger.info(`  ... and ${files.length - 10} more files`);
    }

    // Show next steps
    logger.newLine();
    const instructions = template.getPostInstallInstructions(templateOptions);
    logger.box([
      "✨ Project created!",
      "",
      "Next steps:",
      ...instructions.map((i) => `  ${i}`),
    ]);
  } catch (error) {
    spinner.fail("Failed to generate project");
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export { initProject as execute };
