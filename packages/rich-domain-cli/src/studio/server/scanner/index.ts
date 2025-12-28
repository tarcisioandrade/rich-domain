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

export interface EnumInfo {
  name: string;
  values: string[];
  filePath?: string;
}

export interface DomainEntity {
  name: string;
  type: "entity" | "aggregate" | "value-object";
  filePath: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  hasSchema: boolean;
  enums: EnumInfo[];
}

export interface DomainStructure {
  entities: DomainEntity[];
  enums: EnumInfo[];
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
  const allEnumsMap = new Map<string, EnumInfo>();

  // Common domain directories
  const searchPaths = [
    join(projectPath, "src", "domain"),
    join(projectPath, "src", "core", "domain"),
    join(projectPath, "domain"),
    join(projectPath, "src"),
  ];

  for (const searchPath of searchPaths) {
    try {
      scanDirectory(searchPath, entities, scannedFiles, allEnumsMap);
    } catch (error) {
      // Directory doesn't exist, skip
      continue;
    }
  }

  const uniqueEntities = Array.from(
    new Map(entities.map((e) => [e.name, e])).values()
  );

  // Collect all unique enums from entities
  const enumsMap = new Map<string, EnumInfo>();
  for (const entity of uniqueEntities) {
    for (const enumInfo of entity.enums) {
      if (!enumsMap.has(enumInfo.name)) {
        enumsMap.set(enumInfo.name, enumInfo);
      }
    }
  }

  // Merge with enums found in other files
  for (const [name, enumInfo] of allEnumsMap) {
    if (!enumsMap.has(name)) {
      enumsMap.set(name, enumInfo);
    }
  }

  console.log("[SCANNER] Total enums found:", enumsMap.size);

  return {
    entities: uniqueEntities,
    enums: Array.from(enumsMap.values()),
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
  allEnumsMap: Map<string, EnumInfo>,
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
        scanDirectory(fullPath, entities, scannedFiles, allEnumsMap, depth + 1);
      } else if (stat.isFile()) {
        const ext = extname(fullPath);
        if (ext === ".ts" || ext === ".js") {
          analyzeFile(fullPath, entities, scannedFiles, allEnumsMap);
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
  scannedFiles: Set<string>,
  allEnumsMap: Map<string, EnumInfo>
): void {
  try {
    const content = readFileSync(filePath, "utf-8");
    scannedFiles.add(filePath);

    // Extract enums from ALL files, not just entity files
    const fileEnums = extractEnums(content);
    for (const enumInfo of fileEnums) {
      if (!allEnumsMap.has(enumInfo.name)) {
        // Normalize path: remove cwd and convert backslashes to forward slashes
        const relativePath = filePath
          .replace(process.cwd(), "")
          .replace(/\\/g, "/");

        allEnumsMap.set(enumInfo.name, {
          ...enumInfo,
          filePath: relativePath
        });
        console.log(`[SCANNER] Found enum ${enumInfo.name} in ${relativePath}`);
      }
    }

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

      // Extract enums from the file
      const enums = extractEnums(content);

      if (enums.length > 0) {
        console.log(`[SCANNER] Found ${enums.length} enums in ${className}:`, enums.map(e => e.name));
      }

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
        enums,
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

  // Keywords to exclude (control flow and other non-method keywords)
  const excludedKeywords = new Set([
    "if", "else", "while", "for", "switch", "catch", "with",
    "return", "throw", "try", "await", "yield", "import", "export",
    "function", "class", "interface", "type", "enum", "namespace"
  ]);

  // Regex to capture full method signature including parameters and return type
  // Matches: methodName(params): returnType { or methodName(params) {
  const methodRegex =
    /(?:public|private|protected)?\s*(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g;
  const matches = [...content.matchAll(methodRegex)];

  for (const match of matches) {
    const methodName = match[1];
    const params = match[2]?.trim() || "";
    const returnType = match[3]?.trim() || "void";

    // Skip constructor, getters, private methods, and control flow keywords
    if (
      methodName !== "constructor" &&
      methodName !== className &&
      !methodName.startsWith("_") &&
      !methodName.startsWith("get") &&
      !excludedKeywords.has(methodName)
    ) {
      // Build full signature
      const signature = `${methodName}(${params}): ${returnType}`;
      methods.push({ name: methodName, signature });
    }
  }

  return methods.slice(0, 10); // Limit to first 10 methods
}

/**
 * Extract property info from schema definitions or TypeScript interfaces
 * Supports: Zod, Valibot, ArkType, and plain TypeScript
 */
function extractProperties(content: string): PropertyInfo[] {
  const properties: PropertyInfo[] = [];

  // Try Zod: z.object({ ... })
  const zodSchemaRegex = /z\.object\(\s*\{([\s\S]*?)\}\s*\)/;
  const zodMatch = content.match(zodSchemaRegex);

  // Try Valibot: v.object({ ... })
  const valibotSchemaRegex = /v\.object\(\s*\{([\s\S]*?)\}\s*\)/;
  const valibotMatch = content.match(valibotSchemaRegex);

  // Try ArkType: type({ ... })
  const arkTypeSchemaRegex = /type\(\s*\{([\s\S]*?)\}\s*\)/;
  const arkTypeMatch = content.match(arkTypeSchemaRegex);

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

      if (zodType.includes("z.nativeEnum")) {
        // Extract native enum type like z.nativeEnum(Status)
        const nativeEnumMatch = zodType.match(/z\.nativeEnum\((\w+)\)/);
        if (nativeEnumMatch) {
          tsType = nativeEnumMatch[1];
        } else {
          tsType = "enum";
        }
      } else if (zodType.includes("z.enum")) {
        // Extract enum values like z.enum(['active', 'inactive'])
        const enumMatch = zodType.match(/z\.enum\(\s*\[\s*(['"][\w-]+['"]\s*,?\s*)+\]\s*\)/);
        if (enumMatch) {
          // Extract the enum values
          const valuesMatch = zodType.match(/\[\s*(['"]\w+['"]\s*,?\s*)+\]/);
          if (valuesMatch) {
            const values = valuesMatch[0]
              .match(/['"](\w+)['"]/g)
              ?.map(v => v.replace(/['"]/g, ''));
            if (values) {
              tsType = values.map(v => `"${v}"`).join(" | ");
            } else {
              tsType = "string";
            }
          } else {
            tsType = "string";
          }
        } else {
          tsType = "string";
        }
      } else if (zodType.includes("z.string")) {
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
  } else if (valibotMatch) {
    // Valibot schema extraction
    const schemaBody = valibotMatch[1];
    const lines = schemaBody.split(/,\s*\n/).map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith("//")) continue;

      const propMatch = line.match(/(\w+)\s*:\s*(.+)/);
      if (!propMatch) continue;

      const [, propName, valibotType] = propMatch;
      const optional = valibotType.includes("v.optional(");

      let tsType = "any";
      if (valibotType.includes("v.string(")) tsType = "string";
      else if (valibotType.includes("v.number(")) tsType = "number";
      else if (valibotType.includes("v.boolean(")) tsType = "boolean";
      else if (valibotType.includes("v.date(")) tsType = "Date";
      else if (valibotType.includes("v.array(")) tsType = "any[]";
      else if (valibotType.includes("v.enum(")) {
        const enumMatch = valibotType.match(/v\.enum\(\[([^\]]+)\]\)/);
        if (enumMatch) {
          tsType = enumMatch[1].split(',').map(v => v.trim()).join(" | ");
        } else {
          tsType = "string";
        }
      }

      properties.push({ name: propName, type: tsType, optional });
    }
  } else if (arkTypeMatch) {
    // ArkType schema extraction
    const schemaBody = arkTypeMatch[1];
    const lines = schemaBody.split(/,\s*\n/).map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith("//")) continue;

      const propMatch = line.match(/(\w+)\s*:\s*(.+)/);
      if (!propMatch) continue;

      const [, propName, arkType] = propMatch;
      const optional = arkType.includes("?");

      let tsType = arkType.replace(/['"`]/g, '').replace('?', '').trim();
      if (tsType === "string") tsType = "string";
      else if (tsType === "number") tsType = "number";
      else if (tsType === "boolean") tsType = "boolean";
      else if (tsType.includes("[]")) tsType = tsType;

      properties.push({ name: propName, type: tsType, optional });
    }
  } else {
    // Fallback: Try to extract from TypeScript interface/type in Props
    const propsInterfaceRegex = /interface\s+\w+Props\s+(?:extends\s+\w+\s+)?\{([\s\S]*?)\}/;
    const propsMatch = content.match(propsInterfaceRegex);

    if (propsMatch) {
      const interfaceBody = propsMatch[1];
      const lines = interfaceBody.split(/\n/).map((line) => line.trim());

      for (const line of lines) {
        if (!line || line.startsWith("//") || line.startsWith("/*")) continue;

        const propMatch = line.match(/(\w+)\??\s*:\s*([^;]+)/);
        if (!propMatch) continue;

        const [, propName, tsType] = propMatch;
        const optional = line.includes("?:");

        properties.push({
          name: propName,
          type: tsType.trim().replace(/;$/, ''),
          optional
        });
      }
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

/**
 * Extract enum definitions from file content
 */
function extractEnums(content: string): EnumInfo[] {
  const enums: EnumInfo[] = [];

  // Match TypeScript enum declarations: enum Name { VALUE1 = 'value1', VALUE2 = 'value2' }
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  const enumMatches = [...content.matchAll(enumRegex)];

  for (const match of enumMatches) {
    const [, enumName, enumBody] = match;
    const values: string[] = [];

    // Extract enum values
    // Match: KEY = 'value' or KEY = "value" or KEY (for numeric enums)
    const valueRegex = /(\w+)\s*(?:=\s*['"]([^'"]+)['"]|=\s*(\d+)|(?=[,\s}]))/g;
    const valueMatches = [...enumBody.matchAll(valueRegex)];

    for (const valueMatch of valueMatches) {
      const [, key, stringValue] = valueMatch;
      // For string enums, use the string value; for numeric or auto, use the key
      values.push(stringValue || key);
    }

    if (values.length > 0) {
      enums.push({ name: enumName, values });
    }
  }

  return enums;
}
