import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scanDomain } from "./scanner/index.js";
import { executeCode } from "./executor/sandbox.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create and configure Fastify server for Rich Domain Studio
 */
async function createServer() {
  const fastify = Fastify({
    logger: {
      level: 'info'
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
      console.log("[API] /api/execute called");
      try {
        const { code } = request.body;
        console.log("[API] Code to execute:", code.substring(0, 100) + "...");
        const projectPath = process.cwd();
        console.log("[API] Project path:", projectPath);

        const result = await executeCode(code, projectPath);

        console.log("[API] Execution result:", JSON.stringify(result, null, 2));

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("[API] Execution error:", error);
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
 * Start the server
 */
async function start() {
  const port = parseInt(process.env.PORT || "6699", 10);
  const server = await createServer();

  try {
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`Studio running at http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start server if running directly
start();
