import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { scanDomain } from "./server/scanner/index.js";
import { executeCode } from "./server/executor/sandbox.js";

/**
 * Development server for Rich Domain Studio
 * This server only provides API endpoints and doesn't serve static files.
 * The frontend is served by Vite dev server (port 5173).
 */
async function createDevServer() {
  const fastify = Fastify({
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: {
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    },
  });

  // Enable CORS for Vite dev server
  await fastify.register(fastifyCors, {
    origin: ["http://localhost:5173"],
    credentials: true,
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

      console.log("domain", domain);
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

  return fastify;
}

/**
 * Start the development server
 */
async function start() {
  const port = parseInt(process.env.PORT || "6699", 10);
  const server = await createDevServer();

  try {
    await server.listen({ port, host: "0.0.0.0" });
    console.log("\n🚀 Development Server Started!");
    console.log(`   API: http://localhost:${port}`);
    console.log(`   Frontend: http://localhost:5173 (Vite dev server)`);
    console.log(
      "\n📝 Make changes to the web UI and see them reload instantly!\n"
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start server if running directly
start();
