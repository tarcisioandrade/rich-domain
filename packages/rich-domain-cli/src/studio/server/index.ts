import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanDomain } from "./scanner/index.js";
import { executeCode } from "./executor/sandbox.js";
import { existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if @woltz/rich-domain package is installed in the user's project
 */
function isRichDomainInstalled(projectPath: string): boolean {
  try {
    // Check if package exists in node_modules
    const packagePath = join(
      projectPath,
      "node_modules",
      "@woltz",
      "rich-domain"
    );
    const packageJsonPath = join(packagePath, "package.json");

    return existsSync(packageJsonPath);
  } catch (error) {
    return false;
  }
}

/**
 * Create and configure Fastify server for Rich Domain Studio
 */
async function createServer() {
  const fastify = Fastify({
    logger: {
      level: "info",
    },
  });

  // Enable CORS
  await fastify.register(fastifyCors, {
    origin: true,
  });

  // API Routes
  fastify.get("/api/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  /**
   * GET /api/package-status
   * Check if @woltz/rich-domain is installed
   */
  fastify.get("/api/package-status", async () => {
    const projectPath = process.cwd();
    const installed = isRichDomainInstalled(projectPath);

    return {
      success: true,
      installed,
      packageName: "@woltz/rich-domain",
    };
  });

  /**
   * GET /api/domain
   * Scan and return domain structure
   */
  fastify.get("/api/domain", async (_request, reply) => {
    try {
      const projectPath = process.cwd();
      const domain = await scanDomain(projectPath);

      return {
        success: true,
        data: domain,
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  /**
   * POST /api/execute
   * Execute user code in sandbox
   */
  fastify.post<{
    Body: { code: string };
  }>(
    "/api/execute",
    {
      schema: {
        body: {
          type: "object",
          required: ["code"],
          properties: {
            code: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { code } = request.body;
        const projectPath = process.cwd();

        const result = await executeCode(code, projectPath);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        reply.code(500);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  );

  // Serve frontend static files
  const webDistPath = resolve(__dirname, "../web/dist");

  await fastify.register(fastifyStatic, {
    root: webDistPath,
    prefix: "/",
  });

  // Fallback to index.html for SPA
  fastify.setNotFoundHandler((_request, reply) => {
    reply.sendFile("index.html");
  });

  return fastify;
}

/**
 * Start the server with automatic port fallback
 */
async function start() {
  const startPort = parseInt(process.env.PORT || "6699", 10);
  const maxAttempts = 10;
  const server = await createServer();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;

    try {
      await server.listen({ port, host: "0.0.0.0" });

      if (attempt > 0) {
        console.log(
          `Port ${startPort} was in use, started on port ${port} instead`
        );
      }

      // Print success message that the CLI is waiting for
      console.log(`Studio running at http://localhost:${port}`);
      return;
    } catch (error: any) {
      // If port is in use, try next port
      if (error.code === "EADDRINUSE") {
        if (attempt === maxAttempts - 1) {
          console.error(
            `Failed to start server: ports ${startPort}-${port} are all in use`
          );
          process.exit(1);
        }
        // Try next port
        continue;
      }

      // Other errors
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

// Start server if running directly
start();
