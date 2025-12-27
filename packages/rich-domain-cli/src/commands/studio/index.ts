import ora from "ora";
import prompts from "prompts";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import open from "open";
import { logger, code, path as pathStyle } from "../../utils/logger.js";
import { fileExists } from "../../utils/fs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface StudioCommandOptions {
  port?: number;
  noOpen?: boolean;
}

/**
 * Start Rich Domain Studio - Interactive playground for testing domain entities
 */
export async function startStudio(
  options: StudioCommandOptions
): Promise<void> {
  logger.box([
    "🎨 Rich Domain Studio",
    "",
    "Interactive playground for your domain entities",
  ]);
  logger.newLine();

  // Check if project has rich-domain
  const packageJsonPath = resolve(process.cwd(), "package.json");

  if (!fileExists(packageJsonPath)) {
    logger.error("No package.json found in current directory");
    logger.info("Make sure you're in a Node.js project");
    process.exit(1);
  }

  // Validate port
  const port = options.port || 6699;

  if (port < 1024 || port > 65535) {
    logger.error("Port must be between 1024 and 65535");
    process.exit(1);
  }

  // Show configuration
  logger.info("Configuration:");
  logger.listItem(`Port: ${code(String(port))}`);
  logger.listItem(`Project: ${pathStyle(process.cwd())}`);
  logger.newLine();

  // Confirm if not forced
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: "Start studio?",
    initial: true,
  });

  if (!confirm) {
    logger.info("Aborted");
    process.exit(0);
  }

  logger.newLine();
  const spinner = ora("Starting studio server...").start();

  try {
    // Resolve server path (will be in dist after build)
    const serverPath = resolve(__dirname, "../../studio/server/index.js");

    // Check if server exists
    if (!fileExists(serverPath)) {
      spinner.fail("Studio server not found");
      logger.error(
        "Server files not built. Run 'npm run build' in the CLI package."
      );
      process.exit(1);
    }

    // Start server process
    const serverProcess = spawn("node", [serverPath], {
      stdio: ["inherit", "pipe", "inherit"],
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "development",
      },
    });

    // Wait for server to be ready and forward stdout
    let serverReady = false;

    serverProcess.stdout?.on("data", (data) => {
      const output = data.toString();

      // Forward all stdout to console
      process.stdout.write(output);

      // Check if server is ready
      if (!serverReady && output.includes("Studio running")) {
        serverReady = true;
      }
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Server startup timeout"));
      }, 10000);

      const checkReady = () => {
        if (serverReady) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();

      serverProcess.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    spinner.succeed("Studio server started");

    const url = `http://localhost:${port}`;
    logger.newLine();
    logger.success(`Studio running at ${code(url)}`);
    logger.newLine();

    // Open browser
    if (!options.noOpen) {
      logger.step("Opening browser...");
      await open(url);
    }

    // Show instructions
    logger.box([
      "Studio is running!",
      "",
      "Press Ctrl+C to stop the server",
      "",
      "Features:",
      "  • Interactive code playground",
      "  • Domain entity visualization",
      "  • Real-time validation testing",
      "  • Auto-complete and IntelliSense",
    ]);

    // Handle cleanup
    const cleanup = () => {
      logger.newLine();
      logger.step("Shutting down studio...");
      serverProcess.kill();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Keep process alive
    serverProcess.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        logger.error(`Server exited with code ${code}`);
        process.exit(code);
      }
    });
  } catch (error) {
    spinner.fail("Failed to start studio");
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export { startStudio as execute };