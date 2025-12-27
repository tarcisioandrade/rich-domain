import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface MethodInfo {
  name: string;
  signature: string;
}

export interface DomainEntity {
  name: string;
  type: "entity" | "aggregate" | "value-object";
  filePath: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  hasSchema: boolean;
}

export interface DomainStructure {
  entities: DomainEntity[];
  totalFiles: number;
  scannedAt: string;
}

/**
 * Simple regex-based scanner for Rich Domain classes
 * This is a lightweight approach - doesn't use full AST parsing
 */
export async function scanDomain(
  projectPath: string
): Promise<DomainStructure> {
  const entities: DomainEntity[] = [];
  const scannedFiles = new Set<string>();

  // Common domain directories
  const searchPaths = [
    join(projectPath, "src", "domain"),
    join(projectPath, "src", "core", "domain"),
    join(projectPath, "domain"),
    join(projectPath, "src"),
  ];

  for (const searchPath of searchPaths) {
    try {
      scanDirectory(searchPath, entities, scannedFiles);
    } catch (error) {
      // Directory doesn't exist, skip
      continue;
    }
  }

  const uniqueEntities = Array.from(
    new Map(entities.map((e) => [e.name, e])).values()
  );

  return {
    entities: uniqueEntities,
    totalFiles: scannedFiles.size,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Recursively scan directory for domain files
 */
function scanDirectory(
  dirPath: string,
  entities: DomainEntity[],
  scannedFiles: Set<string>,
  depth: number = 0
): void {
  // Limit recursion depth
  if (depth > 5) return;

  try {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);

      // Skip node_modules and common ignore patterns
      if (
        entry === "node_modules" ||
        entry === "dist" ||
        entry === "build" ||
        entry === ".git" ||
        entry.startsWith(".")
      ) {
        continue;
      }

      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath, entities, scannedFiles, depth + 1);
      } else if (stat.isFile()) {
        const ext = extname(fullPath);
        if (ext === ".ts" || ext === ".js") {
          analyzeFile(fullPath, entities, scannedFiles);
        }
      }
    }
  } catch (error) {
    // Skip inaccessible directories
    return;
  }
}

/**
 * Analyze a single file for Rich Domain classes
 */
function analyzeFile(
  filePath: string,
  entities: DomainEntity[],
  scannedFiles: Set<string>
): void {
  try {
    const content = readFileSync(filePath, "utf-8");
    scannedFiles.add(filePath);

    // Look for class declarations extending Rich Domain base classes
    const classRegex =
      /class\s+(\w+)\s+extends\s+(Entity|Aggregate|ValueObject)/g;
    const matches = [...content.matchAll(classRegex)];

    for (const match of matches) {
      const [, className, baseClass] = match;

      // Determine type
      let type: DomainEntity["type"];
      if (baseClass === "Aggregate") {
        type = "aggregate";
      } else if (baseClass === "ValueObject") {
        type = "value-object";
      } else {
        type = "entity";
      }

      // Extract methods (simple approach)
      const methods = extractMethods(content, className);

      // Extract properties from schema
      const properties = extractProperties(content);

      // Check if has schema
      const hasSchema =
        content.includes("constructor") &&
        (content.includes("super(") || content.includes("super(props"));

      // Normalize path: remove cwd and convert backslashes to forward slashes
      const relativePath = filePath
        .replace(process.cwd(), "")
        .replace(/\\/g, "/");

      entities.push({
        name: className,
        type,
        filePath: relativePath,
        methods,
        properties,
        hasSchema,
      });
    }
  } catch (error) {
    // Skip files that can't be read
    return;
  }
}

/**
 * Extract method signatures from class
 */
function extractMethods(content: string, className: string): MethodInfo[] {
  const methods: MethodInfo[] = [];

  // Regex to capture full method signature including parameters and return type
  // Matches: methodName(params): returnType { or methodName(params) {
  const methodRegex =
    /(?:public|private|protected)?\s*(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g;
  const matches = [...content.matchAll(methodRegex)];

  for (const match of matches) {
    const methodName = match[1];
    const params = match[2]?.trim() || "";
    const returnType = match[3]?.trim() || "void";

    // Skip constructor, getters, and private methods
    if (
      methodName !== "constructor" &&
      methodName !== className &&
      !methodName.startsWith("_") &&
      !methodName.startsWith("get")
    ) {
      // Build full signature
      const signature = `${methodName}(${params}): ${returnType}`;
      methods.push({ name: methodName, signature });
    }
  }

  return methods.slice(0, 10); // Limit to first 10 methods
}

/**
 * Extract property info from schema definitions
 */
function extractProperties(content: string): PropertyInfo[] {
  const properties: PropertyInfo[] = [];

  // Look for Zod schema definitions like z.object({ ... })
  const zodSchemaRegex = /z\.object\(\s*\{([\s\S]*?)\}\s*\)/;
  const zodMatch = content.match(zodSchemaRegex);

  if (zodMatch) {
    const schemaBody = zodMatch[1];
    // Extract each property line
    const lines = schemaBody.split(/,\s*\n/).map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith("//")) continue;

      // Match: propertyName: z.type().optional()
      const propMatch = line.match(/(\w+)\s*:\s*(.+)/);
      if (!propMatch) continue;

      const [, propName, zodType] = propMatch;

      // Determine if optional
      const optional = zodType.includes(".optional()");

      // Infer TypeScript type from Zod type
      let tsType = "any";

      if (zodType.includes("z.string")) {
        tsType = "string";
      } else if (zodType.includes("z.number")) {
        tsType = "number";
      } else if (zodType.includes("z.boolean")) {
        tsType = "boolean";
      } else if (zodType.includes("z.date")) {
        tsType = "Date";
      } else if (zodType.includes("z.array")) {
        // Try to extract array element type
        const arrayTypeMatch = zodType.match(/z\.array\(z\.instanceof\((\w+)\)/);
        if (arrayTypeMatch) {
          tsType = `${arrayTypeMatch[1]}[]`;
        } else {
          tsType = "any[]";
        }
      } else if (zodType.includes("z.custom<")) {
        // Extract custom type like z.custom<Id>()
        const customMatch = zodType.match(/z\.custom<(\w+)>/);
        if (customMatch) {
          tsType = customMatch[1];
        }
      } else if (zodType.includes("z.instanceof")) {
        // Extract instanceof type like z.instanceof(Email)
        const instanceMatch = zodType.match(/z\.instanceof\((\w+)\)/);
        if (instanceMatch) {
          tsType = instanceMatch[1];
        }
      }

      properties.push({ name: propName, type: tsType, optional });
    }
  }

  // Also look for getter methods as they often represent properties
  const getterRegex = /get\s+(\w+)\s*\(\s*\)/g;
  const getterMatches = [...content.matchAll(getterRegex)];

  for (const match of getterMatches) {
    const propName = match[1];
    if (!properties.find((p) => p.name === propName)) {
      properties.push({ name: propName, type: "any", optional: true });
    }
  }

  return properties.slice(0, 20); // Limit to first 20 properties
}
