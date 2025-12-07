import cac from "cac";
import { createRequire } from "node:module";
import { generateFromPrisma } from "./commands/generate/index.js";
import type { GenerateCommandOptions } from "./commands/generate/index.js";
import { initProject } from "./commands/init/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

/**
 * Create and configure the CLI
 */
export function createCli() {
  const cli = cac("rich-domain");

  // Init command
  cli
    .command("init [directory]", "Initialize a new project from a template")
    .option("-t, --template <name>", "Template to use (fullstack)", {
      default: undefined,
    })
    .option(
      "-p, --package-manager <pm>",
      "Package manager to use (npm, pnpm, yarn, bun)",
      { default: undefined }
    )
    .option(
      "-f, --force",
      "Skip confirmation prompts and overwrite existing files",
      { default: false }
    )
    .example("  $ rich-domain init my-app")
    .example("  $ rich-domain init my-app --template fullstack")
    .example("  $ rich-domain init . --template fullstack")
    .example("  $ rich-domain init my-app -p pnpm")
    .action(
      async (
        directory: string = ".",
        options: { template?: string; packageManager?: string; force?: boolean }
      ) => {
        await initProject(directory, {
          template: options.template,
          packageManager: options.packageManager as
            | "npm"
            | "pnpm"
            | "yarn"
            | "bun"
            | undefined,
          force: options.force,
        });
      }
    );

  // Generate command
  cli
    .command("generate", "Generate domain entities from Prisma schema")
    .option("-s, --schema <path>", "Path to Prisma schema file", {
      default: undefined,
    })
    .option("-o, --output <path>", "Output directory for generated files", {
      default: "src",
    })
    .option(
      "-v, --validation <type>",
      "Validation library to use (zod, valibot, arktype, none)",
      { default: undefined }
    )
    .option(
      "-m, --models <names>",
      "Comma-separated list of models to generate",
      { default: undefined }
    )
    .option("--dry-run", "Show what would be generated without writing files", {
      default: false,
    })
    .option("-f, --force", "Skip confirmation prompts", { default: false })
    .example("  $ rich-domain generate")
    .example("  $ rich-domain generate --schema prisma/schema.prisma")
    .example("  $ rich-domain generate --output src --validation zod")
    .example("  $ rich-domain generate --models User,Post,Comment")
    .example("  $ rich-domain generate --dry-run")
    .action(async (options: GenerateCommandOptions) => {
      await generateFromPrisma(options);
    });

  // Help improvements
  cli.help();
  cli.version(version);

  // Handle unknown commands
  cli.on("command:*", () => {
    console.error("Unknown command: %s", cli.args.join(" "));
    console.log("Run 'rich-domain --help' for available commands");
    process.exit(1);
  });

  return cli;
}
