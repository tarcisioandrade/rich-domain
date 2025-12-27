import { VM } from "vm2";
import { resolve } from "node:path";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { build } from "esbuild";

export interface ExecutionResult {
  success: boolean;
  output?: any;
  logs?: string[];
  errors?: Array<{
    message: string;
    stack?: string;
    line?: number;
  }>;
  validationErrors?: Array<{
    path: string;
    message: string;
    expected?: any;
    received?: any;
  }>;
}

/**
 * Execute user code in a sandboxed VM
 */
export async function executeCode(
  code: string,
  projectPath: string
): Promise<ExecutionResult> {
  console.log("[EXECUTOR] ===== executeCode function called =====");
  console.log("[EXECUTOR] Project path:", projectPath);
  console.log("[EXECUTOR] Code length:", code.length);

  const logs: string[] = [];
  const errors: ExecutionResult["errors"] = [];

  try {
    // Import scanner to get domain entities
    console.log("[EXECUTOR] Importing scanner...");
    const { scanDomain } = await import("../scanner/index.js");
    console.log("[EXECUTOR] Scanner imported successfully");

    console.log("[EXECUTOR] Scanning domain...");
    const domain = await scanDomain(projectPath);
    console.log("[EXECUTOR] Domain scanned, found", domain.entities.length, "entities");

    // Create a SINGLE bundle with ALL entities to ensure class identity
    // This prevents each entity from having its own copy of other entities
    console.log("[EXECUTOR] Creating unified bundle for all entities...");

    let module: any = null;
    let richDomainClasses: any = null;
    const userClasses: Record<string, any> = {};

    try {
      // Create a single wrapper that exports ALL entities and rich-domain
      const wrapperFileName = `.studio-wrapper-all-${Date.now()}.ts`;
      const wrapperFilePath = resolve(projectPath, wrapperFileName);

      // Build export statements for all entities
      const entityExports = domain.entities
        .map((entity) => {
          const entityPath = resolve(projectPath, entity.filePath.replace(/^\//, ""));
          return `export { ${entity.name} } from "${entityPath.replace(/\\/g, "/")}";`;
        })
        .join("\n");

      const wrapperContent = `
// Re-export all entities
${entityExports}

// Re-export all rich-domain classes
export * from "@woltz/rich-domain";
`;

      writeFileSync(wrapperFilePath, wrapperContent, "utf-8");
      console.log("[EXECUTOR] Created unified wrapper:", wrapperFilePath);

      // Create temp directory for bundle
      const tempDir = resolve(tmpdir(), "rich-domain-studio");
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      const tempFileName = `bundle-all-${Date.now()}.mjs`;
      const tempFilePath = resolve(tempDir, tempFileName);

      try {
        // Bundle everything together
        await build({
          entryPoints: [wrapperFilePath],
          bundle: true,
          format: "esm",
          platform: "node",
          target: "es2020",
          outfile: tempFilePath,
          absWorkingDir: projectPath,
          external: [],
          logLevel: "silent",
        });

        console.log("[EXECUTOR] Unified bundle created:", tempFilePath);

        // Import the unified bundle
        const fileUrl = `file:///${tempFilePath.replace(/\\/g, "/")}`;
        module = await import(fileUrl);

        console.log("[EXECUTOR] Module exports:", Object.keys(module).slice(0, 30));

        // Extract user entities
        for (const entity of domain.entities) {
          if (module[entity.name]) {
            userClasses[entity.name] = module[entity.name];
            console.log("[EXECUTOR] Loaded:", entity.name, "=", typeof userClasses[entity.name]);
          } else {
            console.log("[EXECUTOR] Warning: Entity", entity.name, "not found in bundle");
          }
        }

        // Extract rich-domain classes
        if (module.Id) {
          console.log("[EXECUTOR] Extracting rich-domain classes from unified bundle");
          richDomainClasses = {
            Id: module.Id,
            Entity: module.Entity,
            Aggregate: module.Aggregate,
            ValueObject: module.ValueObject,
            DomainEvent: module.DomainEvent,
            DomainError: module.DomainError,
            Result: module.Result,
          };

          richDomainClasses = Object.fromEntries(
            Object.entries(richDomainClasses).filter(([_, v]) => v !== undefined)
          );

          console.log("[EXECUTOR] Extracted classes:", Object.keys(richDomainClasses));
        }
      } finally {
        // Clean up wrapper file
        try {
          const { unlinkSync } = await import("node:fs");
          unlinkSync(wrapperFilePath);
        } catch (e) {
          console.log("[EXECUTOR] Could not delete wrapper:", e);
        }
      }
    } catch (e) {
      console.log("[EXECUTOR] Failed to create unified bundle:", e);
    }

    // Fallback: load rich-domain from package if extraction failed
    if (!richDomainClasses) {
      console.log("[EXECUTOR] Loading rich-domain classes from package as fallback");
      try {
        richDomainClasses = await import("@woltz/rich-domain");
        console.log("[EXECUTOR] Rich domain classes loaded:", Object.keys(richDomainClasses).slice(0, 10));
      } catch (e) {
        console.log("[EXECUTOR] Failed to load rich-domain:", e);
        richDomainClasses = {};
      }
    }

    console.log("[EXECUTOR] User classes loaded:", Object.keys(userClasses));

    // Create VM with restricted access
    const vm = new VM({
      timeout: 5000, // 5 second timeout
      sandbox: {
        // Provide console for logging
        console: {
          log: (...args: any[]) => {
            logs.push(args.map((a) => String(a)).join(" "));
          },
          error: (...args: any[]) => {
            errors.push({
              message: args.map((a) => String(a)).join(" "),
            });
          },
          warn: (...args: any[]) => {
            logs.push(`[WARN] ${args.map((a) => String(a)).join(" ")}`);
          },
          info: (...args: any[]) => {
            logs.push(`[INFO] ${args.map((a) => String(a)).join(" ")}`);
          },
        },
        // Add Rich Domain classes globally
        ...richDomainClasses,
        // Add user's domain entities globally
        ...userClasses,
        // Provide a simple require for compatibility (but classes are already global)
        require: (moduleName: string) => {
          // Allow rich-domain imports
          if (moduleName === "@woltz/rich-domain") {
            return richDomainClasses;
          }

          throw new Error(`Module '${moduleName}' is not allowed in sandbox. All domain classes are available globally.`);
        },
      },
    });

    // Wrap code to capture result
    const wrappedCode = `
      (async () => {
        ${code}
      })()
    `;

    // Execute code
    const result = await vm.run(wrappedCode);

    console.log("[EXECUTOR] Logs captured:", logs);
    console.log("[EXECUTOR] Errors:", errors);
    console.log("[EXECUTOR] Result:", result);

    // Check if result is a Rich Domain Result type
    if (result && typeof result === "object") {
      // Handle Result<T, E> pattern
      if ("isLeft" in result && typeof result.isLeft === "function") {
        if (result.isLeft()) {
          // Validation or domain error
          const error = result.value;

          // Try to extract validation errors
          if (Array.isArray(error)) {
            return {
              success: false,
              logs,
              validationErrors: error.map((e: any) => ({
                path: e.path || "unknown",
                message: e.message || String(e),
                expected: e.expected,
                received: e.received,
              })),
            };
          }

          return {
            success: false,
            logs,
            errors: [
              {
                message: String(error),
              },
            ],
          };
        } else {
          // Success case from Result pattern
          const hasErrors = errors.length > 0;
          return {
            success: !hasErrors,
            output: result.value,
            logs,
            errors: hasErrors ? errors : undefined,
          };
        }
      }
    }

    // Regular output
    // Check if there were any errors captured via console.error
    const hasErrors = errors.length > 0;

    return {
      success: !hasErrors,
      output: result,
      logs,
      errors: hasErrors ? errors : undefined,
    };
  } catch (error) {
    // Runtime error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Try to extract line number from stack
    let line: number | undefined;
    if (stack) {
      const lineMatch = stack.match(/:(\d+):\d+/);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
      }
    }

    return {
      success: false,
      logs,
      errors: [
        {
          message: errorMessage,
          stack,
          line,
        },
      ],
    };
  }
}
