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
  const logs: string[] = [];
  const errors: ExecutionResult["errors"] = [];
  // Wrapper adds 2 lines before user code: empty line + "(async () => {"
  const WRAPPER_OFFSET = 2;

  try {
    // Import scanner to get domain entities
    const { scanDomain } = await import("../scanner/index.js");
    const domain = await scanDomain(projectPath);
    // Create a SINGLE bundle with ALL entities to ensure class identity
    // This prevents each entity from having its own copy of other entities

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

      // Build export statements for all enums from domain.enums
      const enumExports: string[] = [];

      for (const enumInfo of domain.enums) {
        if (enumInfo.filePath) {
          const enumPath = resolve(projectPath, enumInfo.filePath.replace(/^\//, ""));
          enumExports.push(`export { ${enumInfo.name} } from "${enumPath.replace(/\\/g, "/")}";`);
        }
      }

      const wrapperContent = `
// Re-export all entities
${entityExports}

// Re-export all enums
${enumExports.join("\n")}

// Re-export all rich-domain classes
export * from "@woltz/rich-domain";
`;

      writeFileSync(wrapperFilePath, wrapperContent, "utf-8");

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

        // Import the unified bundle
        const fileUrl = `file:///${tempFilePath.replace(/\\/g, "/")}`;
        module = await import(fileUrl);

        // Extract user entities
        for (const entity of domain.entities) {
          if (module[entity.name]) {
            userClasses[entity.name] = module[entity.name];
          }
        }

        // Also extract enums and other exports from the module
        // Look for any capitalized exports that aren't already loaded
        const loadedNames = new Set([
          ...Object.keys(userClasses),
          'Id', 'Entity', 'Aggregate', 'ValueObject', 'DomainEvent', 'DomainError',
          'Result', 'default'
        ]);

        for (const exportName of Object.keys(module)) {
          if (!loadedNames.has(exportName) && exportName.match(/^[A-Z]/)) {
            // Likely an enum or other type - add to userClasses
            userClasses[exportName] = module[exportName];
          }
        }

        // Extract rich-domain classes
        if (module.Id) {
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

        }
      } finally {
        // Clean up wrapper file
        try {
          const { unlinkSync } = await import("node:fs");
          unlinkSync(wrapperFilePath);
        } catch (e) {
        }
      }
    } catch (e) {
      console.error("[EXECUTOR] Failed to create unified bundle:", e);
    }

    // Fallback: load rich-domain from package if extraction failed
    if (!richDomainClasses) {
      try {
        richDomainClasses = await import("@woltz/rich-domain");
      } catch (e) {
        console.error("[EXECUTOR] Failed to load rich-domain:", e);
        richDomainClasses = {};
      }
    }

    // Create VM with restricted access
    const vm = new VM({
      timeout: 5000, // 5 second timeout
      sandbox: {
        // Provide console for logging
        console: {
          log: (...args: any[]) => {
            const formatted = args.map((a) => {
              if (typeof a === 'object' && a !== null) {
                try {
                  return JSON.stringify(a, null, 2);
                } catch (e) {
                  return String(a);
                }
              }
              return String(a);
            }).join(" ");
            logs.push(formatted);
          },
          error: (...args: any[]) => {
            const formatted = args.map((a) => {
              if (typeof a === 'object' && a !== null) {
                try {
                  return JSON.stringify(a, null, 2);
                } catch (e) {
                  return String(a);
                }
              }
              return String(a);
            }).join(" ");
            errors.push({
              message: formatted,
            });
          },
          warn: (...args: any[]) => {
            const formatted = args.map((a) => {
              if (typeof a === 'object' && a !== null) {
                try {
                  return JSON.stringify(a, null, 2);
                } catch (e) {
                  return String(a);
                }
              }
              return String(a);
            }).join(" ");
            logs.push(`[WARN] ${formatted}`);
          },
          info: (...args: any[]) => {
            const formatted = args.map((a) => {
              if (typeof a === 'object' && a !== null) {
                try {
                  return JSON.stringify(a, null, 2);
                } catch (e) {
                  return String(a);
                }
              }
              return String(a);
            }).join(" ");
            logs.push(`[INFO] ${formatted}`);
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

    // Split code into lines once
    const codeLines = code.split('\n');

    // Try to extract line number from stack
    let line: number | undefined;
    if (stack) {
      // Look for "vm.js:LINE" which is the virtual file used by vm2
      const lineMatch = stack.match(/vm\.js:(\d+)/);
      if (lineMatch) {
        const wrappedLine = parseInt(lineMatch[1], 10);
        // Adjust line number to account for wrapper offset
        line = wrappedLine > WRAPPER_OFFSET ? wrappedLine - WRAPPER_OFFSET : wrappedLine;
      }
    }

    // Extract the problematic line from user code for better error display
    let codeSnippet: string | undefined;

    if (line) {
      // Show 3 lines of context: 1 before, the error line, and 1 after
      const startLine = Math.max(0, line - 2);
      const endLine = Math.min(codeLines.length, line + 1);
      const contextLines: string[] = [];

      for (let i = startLine; i < endLine; i++) {
        const lineNum = i + 1;
        const prefix = lineNum === line ? '→ ' : '  ';
        const codeLine = codeLines[i] || '';
        contextLines.push(`${prefix}${lineNum}: ${codeLine}`);
      }

      if (contextLines.length > 0) {
        codeSnippet = contextLines.join('\n');
      }

    }

    return {
      success: false,
      logs,
      errors: [
        {
          message: codeSnippet
            ? `${errorMessage}\n\n${codeSnippet}`
            : errorMessage,
          stack,
          line,
        },
      ],
    };
  }
}
