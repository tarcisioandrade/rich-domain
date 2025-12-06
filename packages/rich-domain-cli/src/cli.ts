import cac from "cac";
import { version } from "../package.json" with { type: "json" };
import { generateFromPrisma } from "./commands/generate/index.js";
import type { GenerateCommandOptions } from "./commands/generate/index.js";

/**
 * Create and configure the CLI
 */
export function createCli() {
  const cli = cac("rich-domain");

  // Generate command
  cli
    .command(
      "generate",
      "Generate domain entities from Prisma schema"
    )
    .option(
      "-s, --schema <path>",
      "Path to Prisma schema file",
      { default: undefined }
    )
    .option(
      "-o, --output <path>",
      "Output directory for generated files",
      { default: "src/domain" }
    )
    .option(
      "-v, --validation <type>",
      "Validation library to use (zod, valibot, arktype)",
      { default: "zod" }
    )
    .option(
      "-m, --models <names>",
      "Comma-separated list of models to generate",
      { default: undefined }
    )
    .option(
      "--dry-run",
      "Show what would be generated without writing files",
      { default: false }
    )
    .option(
      "-f, --force",
      "Skip confirmation prompts",
      { default: false }
    )
    .example("  $ rich-domain generate")
    .example("  $ rich-domain generate --schema prisma/schema.prisma")
    .example("  $ rich-domain generate --output src/domain --validation zod")
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
