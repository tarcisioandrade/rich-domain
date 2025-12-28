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

export interface EventHandlerInfo {
  name: string;
  eventType: string;
  filePath: string;
  signature: string;
}

export interface DomainEventInfo {
  name: string;
  filePath: string;
  payloadType: string;
  properties: PropertyInfo[];
  publishers: string[];
  handlers: EventHandlerInfo[];
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
  events: DomainEventInfo[];
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
  const eventsMap = new Map<string, DomainEventInfo>();
  const fileContentsMap = new Map<string, string>();

  // Common domain directories
  const searchPaths = [
    join(projectPath, "src", "domain"),
    join(projectPath, "src", "core", "domain"),
    join(projectPath, "domain"),
    join(projectPath, "src"),
  ];

  for (const searchPath of searchPaths) {
    try {
      scanDirectory(searchPath, entities, scannedFiles, allEnumsMap, eventsMap, fileContentsMap);
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

  // Populate event publishers and handlers using hybrid approach
  for (const [eventName, eventInfo] of eventsMap) {
    // Approach 1: Detect by import analysis (most reliable)
    for (const [filePath, content] of fileContentsMap) {
      const importsEvent = detectEventImport(content, eventName);

      if (importsEvent) {
        // Check if it's likely a publisher (entity/aggregate file)
        const isEntityFile = uniqueEntities.some(e => e.filePath === filePath);

        if (isEntityFile) {
          const entity = uniqueEntities.find(e => e.filePath === filePath);
          if (entity && !eventInfo.publishers.includes(entity.name)) {
            eventInfo.publishers.push(entity.name);
          }
        } else {
          // Not an entity file, likely a handler
          // Create a generic handler entry for files that import the event
          const fileName = filePath.split('/').pop() || filePath;
          const handlerName = fileName.replace(/\.(ts|js)$/, '');

          // Only add if we don't already have a more specific handler for this file
          const hasSpecificHandler = eventInfo.handlers.some(h => h.filePath === filePath);

          if (!hasSpecificHandler) {
            eventInfo.handlers.push({
              name: handlerName,
              eventType: eventName,
              filePath,
              signature: `imports ${eventName}`,
            });
          }
        }
      }
    }

    // Approach 2: Pattern-based detection (less reliable but finds specific handlers)
    for (const [filePath, content] of fileContentsMap) {
      const handlers = detectEventHandlers(content, filePath);
      for (const handler of handlers) {
        // Flexible matching
        const eventNameNormalized = eventName.replace(/Event$/, '').toLowerCase();
        const handlerTypeNormalized = handler.eventType.replace(/Event$/, '').toLowerCase();
        const payloadTypeNormalized = eventInfo.payloadType.replace(/Event$/, '').toLowerCase();

        const isMatch =
          handler.eventType === eventName ||
          handler.eventType === eventInfo.payloadType ||
          handlerTypeNormalized === eventNameNormalized ||
          handlerTypeNormalized === payloadTypeNormalized ||
          handler.eventType.replace(/[._-]/g, '').toLowerCase().includes(eventNameNormalized) ||
          eventNameNormalized.includes(handler.eventType.replace(/[._-]/g, '').toLowerCase());

        if (isMatch) {
          // Replace generic import-based handler with specific one
          const importHandlerIndex = eventInfo.handlers.findIndex(
            h => h.filePath === filePath && h.signature.startsWith('imports ')
          );

          if (importHandlerIndex !== -1) {
            eventInfo.handlers[importHandlerIndex] = handler;
          } else if (!eventInfo.handlers.some(h => h.filePath === filePath && h.name === handler.name)) {
            eventInfo.handlers.push(handler);
          }
        }
      }
    }

    // Approach 3: Detect publishers by actual usage (new EventName)
    for (const entity of uniqueEntities) {
      const entityContent = fileContentsMap.get(entity.filePath);
      if (entityContent && detectEventPublishers(entityContent, eventName)) {
        if (!eventInfo.publishers.includes(entity.name)) {
          eventInfo.publishers.push(entity.name);
        }
      }
    }
  }

  console.log("[SCANNER] Total events found:", eventsMap.size);

  return {
    entities: uniqueEntities,
    enums: Array.from(enumsMap.values()),
    events: Array.from(eventsMap.values()),
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
  eventsMap: Map<string, DomainEventInfo>,
  fileContentsMap: Map<string, string>,
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
        scanDirectory(fullPath, entities, scannedFiles, allEnumsMap, eventsMap, fileContentsMap, depth + 1);
      } else if (stat.isFile()) {
        const ext = extname(fullPath);
        if (ext === ".ts" || ext === ".js") {
          analyzeFile(fullPath, entities, scannedFiles, allEnumsMap, eventsMap, fileContentsMap);
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
  allEnumsMap: Map<string, EnumInfo>,
  eventsMap: Map<string, DomainEventInfo>,
  fileContentsMap: Map<string, string>
): void {
  try {
    const content = readFileSync(filePath, "utf-8");
    scannedFiles.add(filePath);

    // Normalize path: remove cwd and convert backslashes to forward slashes
    const relativePath = filePath
      .replace(process.cwd(), "")
      .replace(/\\/g, "/");

    // Store file content for later analysis (publishers/handlers detection)
    fileContentsMap.set(relativePath, content);

    // Extract enums from ALL files, not just entity files
    const fileEnums = extractEnums(content);
    for (const enumInfo of fileEnums) {
      if (!allEnumsMap.has(enumInfo.name)) {
        allEnumsMap.set(enumInfo.name, {
          ...enumInfo,
          filePath: relativePath
        });
        console.log(`[SCANNER] Found enum ${enumInfo.name} in ${relativePath}`);
      }
    }

    // Extract domain events from file
    const fileEvents = extractDomainEvents(content);
    for (const eventInfo of fileEvents) {
      if (!eventsMap.has(eventInfo.name)) {
        eventsMap.set(eventInfo.name, {
          ...eventInfo,
          filePath: relativePath
        });
        console.log(`[SCANNER] Found event ${eventInfo.name} in ${relativePath}`);
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

/**
 * Extract domain events from file content
 * Pattern: class EventName extends DomainEvent<PayloadType>
 */
function extractDomainEvents(content: string): DomainEventInfo[] {
  const events: DomainEventInfo[] = [];

  // Match: class EventName extends DomainEvent<PayloadType>
  const eventRegex = /class\s+(\w+)\s+extends\s+DomainEvent<([^>]+)>/g;
  const eventMatches = [...content.matchAll(eventRegex)];

  for (const match of eventMatches) {
    const [, eventName, payloadType] = match;

    // Extract payload properties
    const properties = extractEventPayloadProperties(content, payloadType);

    events.push({
      name: eventName,
      filePath: '', // Will be set by caller
      payloadType: payloadType.trim(),
      properties,
      publishers: [], // Will be populated later
      handlers: [], // Will be populated later
    });
  }

  return events;
}

/**
 * Extract properties from event payload type definition
 */
function extractEventPayloadProperties(
  content: string,
  payloadType: string
): PropertyInfo[] {
  const properties: PropertyInfo[] = [];

  // Try to find interface or type definition for payload
  const interfaceRegex = new RegExp(
    `(?:interface|type)\\s+${payloadType}\\s*=?\\s*\\{([\\s\\S]*?)\\}`,
    'g'
  );
  const interfaceMatch = content.match(interfaceRegex);

  if (interfaceMatch && interfaceMatch[0]) {
    const body = interfaceMatch[0];
    const lines = body.split(/\n/).map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

      // Match: propertyName?: type; or propertyName: type;
      const propMatch = line.match(/(\w+)(\?)?:\s*([^;,]+)/);
      if (!propMatch) continue;

      const [, propName, optionalMarker, propType] = propMatch;
      properties.push({
        name: propName,
        type: propType.trim(),
        optional: !!optionalMarker,
      });
    }
  }

  return properties;
}

/**
 * Detect if a file imports a specific event
 * This is more reliable than trying to detect specific usage patterns
 */
function detectEventImport(content: string, eventName: string): boolean {
  const importPatterns = [
    // import { EventName } from '...'
    new RegExp(`import\\s*\\{[^}]*\\b${eventName}\\b[^}]*\\}\\s*from`, 'g'),

    // import EventName from '...'
    new RegExp(`import\\s+${eventName}\\s+from`, 'g'),

    // import * as foo from '...' (less reliable but possible)
    // We can't detect this reliably without checking usage

    // const { EventName } = require('...')
    new RegExp(`(?:const|let|var)\\s*\\{[^}]*\\b${eventName}\\b[^}]*\\}\\s*=\\s*require`, 'g'),

    // const EventName = require('...')
    new RegExp(`(?:const|let|var)\\s+${eventName}\\s*=\\s*require`, 'g'),
  ];

  return importPatterns.some(pattern => pattern.test(content));
}

/**
 * Detect which entities publish a given event
 * Patterns:
 * 1. this.addDomainEvent(new EventName(...))
 * 2. addDomainEvent(new EventName(...))
 * 3. new EventName(...) in hooks (onCreate, onUpdate, etc)
 * 4. eventBus.publish(new EventName(...))
 * 5. dispatcher.dispatch(new EventName(...))
 * 6. emit(new EventName(...))
 */
function detectEventPublishers(
  content: string,
  eventName: string
): boolean {
  const patterns = [
    // Pattern 1: this.addDomainEvent(new EventName())
    new RegExp(`this\\.addDomainEvent\\(\\s*new\\s+${eventName}\\s*\\(`, 'g'),

    // Pattern 2: addDomainEvent(new EventName()) - without this
    new RegExp(`[^.]addDomainEvent\\(\\s*new\\s+${eventName}\\s*\\(`, 'g'),

    // Pattern 3: new EventName() anywhere (could be in hooks, returns, etc)
    new RegExp(`new\\s+${eventName}\\s*\\(`, 'g'),

    // Pattern 4: eventBus.publish(new EventName())
    new RegExp(`\\.publish\\(\\s*new\\s+${eventName}\\s*\\(`, 'g'),

    // Pattern 5: dispatcher.dispatch(new EventName())
    new RegExp(`\\.dispatch\\(\\s*new\\s+${eventName}\\s*\\(`, 'g'),

    // Pattern 6: emit(new EventName())
    new RegExp(`\\.emit\\(\\s*new\\s+${eventName}\\s*\\(`, 'g'),
  ];

  return patterns.some(pattern => pattern.test(content));
}

/**
 * Detect event handlers in file content
 * Patterns:
 * 1. onEventName(event: EventType) methods
 * 2. bus.subscribe(EventName, handler)
 * 3. @EventHandler(EventName) decorators
 * 4. @OnEvent(EventName) decorators (NestJS)
 * 5. Bull @Process() processors
 * 6. handle(event: EventType) methods
 * 7. execute(event: EventType) methods
 */
function detectEventHandlers(
  content: string,
  filePath: string
): EventHandlerInfo[] {
  const handlers: EventHandlerInfo[] = [];

  // Pattern 1: onEventName(event: EventType) methods
  // Blacklist common lifecycle methods that are NOT event handlers
  const lifecycleMethodBlacklist = new Set([
    'onCreate', 'onUpdate', 'onDelete', 'onRemove',
    'onInit', 'onDestroy', 'onMount', 'onUnmount',
    'onBeforeCreate', 'onAfterCreate', 'onBeforeUpdate', 'onAfterUpdate',
    'onBeforeDelete', 'onAfterDelete', 'onBeforeRemove', 'onAfterRemove',
    'onChange', 'onLoad', 'onSave', 'onError', 'onClick', 'onSubmit'
  ]);

  const onMethodRegex = /(?:async\s+)?on(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g;
  const onMethodMatches = [...content.matchAll(onMethodRegex)];

  for (const match of onMethodMatches) {
    const [, eventName, params, returnType] = match;
    const methodName = `on${eventName}`;

    // Skip lifecycle methods
    if (lifecycleMethodBlacklist.has(methodName)) {
      continue;
    }

    // Extract event type from parameters
    let eventType = eventName; // Default to method name
    const paramMatch = params.match(/:\s*(\w+)/);
    if (paramMatch) {
      eventType = paramMatch[1];
    }

    // Only include if the parameter type looks like an event (ends with Event or contains "Event")
    // or if it's clearly an event handler method name
    const looksLikeEvent =
      eventType.includes('Event') ||
      eventName.includes('Event') ||
      params.includes('event:') ||
      params.includes('Event');

    if (looksLikeEvent) {
      handlers.push({
        name: methodName,
        eventType,
        filePath,
        signature: `${methodName}(${params.trim()})${returnType ? `: ${returnType.trim()}` : ''}`,
      });
    }
  }

  // Pattern 2: bus.subscribe(EventName, ...)
  const subscribeRegex = /\.subscribe\(\s*(\w+)\s*,/g;
  const subscribeMatches = [...content.matchAll(subscribeRegex)];

  for (const match of subscribeMatches) {
    const [, eventType] = match;

    handlers.push({
      name: 'subscribe',
      eventType,
      filePath,
      signature: `subscribe(${eventType}, handler)`,
    });
  }

  // Pattern 3: @EventHandler(EventName) decorator
  const eventHandlerDecoratorRegex = /@EventHandler\((\w+)\)/g;
  const decoratorMatches = [...content.matchAll(eventHandlerDecoratorRegex)];

  for (const match of decoratorMatches) {
    const [, eventType] = match;

    // Try to find the class or method this decorator is attached to
    const afterDecorator = content.substring(match.index || 0);
    const classMatch = afterDecorator.match(/class\s+(\w+)/);
    const methodMatch = afterDecorator.match(/(?:async\s+)?(\w+)\s*\(/);

    const handlerName = classMatch ? classMatch[1] : (methodMatch ? methodMatch[1] : 'handler');

    handlers.push({
      name: handlerName,
      eventType,
      filePath,
      signature: `@EventHandler(${eventType}) ${handlerName}`,
    });
  }

  // Pattern 4: @OnEvent(EventName) decorator (NestJS pattern)
  const onEventDecoratorRegex = /@OnEvent\(['"]([\w.]+)['"]\)/g;
  const onEventMatches = [...content.matchAll(onEventDecoratorRegex)];

  for (const match of onEventMatches) {
    const [, eventType] = match;

    const afterDecorator = content.substring(match.index || 0);
    const methodMatch = afterDecorator.match(/(?:async\s+)?(\w+)\s*\(/);
    const handlerName = methodMatch ? methodMatch[1] : 'handler';

    handlers.push({
      name: handlerName,
      eventType,
      filePath,
      signature: `@OnEvent('${eventType}') ${handlerName}()`,
    });
  }

  // Pattern 5: Bull @Process() with job names
  const processDecoratorRegex = /@Process\(['"]([\w.]+)['"]\)/g;
  const processMatches = [...content.matchAll(processDecoratorRegex)];

  for (const match of processMatches) {
    const [, jobName] = match;

    const afterDecorator = content.substring(match.index || 0);
    const methodMatch = afterDecorator.match(/(?:async\s+)?(\w+)\s*\(/);
    const handlerName = methodMatch ? methodMatch[1] : 'process';

    handlers.push({
      name: handlerName,
      eventType: jobName,
      filePath,
      signature: `@Process('${jobName}') ${handlerName}()`,
    });
  }

  // Pattern 6: handle(event: EventType) methods (Command/Event handler pattern)
  const handleMethodRegex = /(?:async\s+)?handle\s*\(\s*(?:\w+\s*:\s*)?(\w+)\s*\)(?:\s*:\s*([^{]+))?\s*\{/g;
  const handleMatches = [...content.matchAll(handleMethodRegex)];

  for (const match of handleMatches) {
    const [, eventType, returnType] = match;

    handlers.push({
      name: 'handle',
      eventType,
      filePath,
      signature: `handle(event: ${eventType})${returnType ? `: ${returnType.trim()}` : ''}`,
    });
  }

  // Pattern 7: execute(event: EventType) methods
  const executeMethodRegex = /(?:async\s+)?execute\s*\(\s*(?:\w+\s*:\s*)?(\w+)\s*\)(?:\s*:\s*([^{]+))?\s*\{/g;
  const executeMatches = [...content.matchAll(executeMethodRegex)];

  for (const match of executeMatches) {
    const [, eventType, returnType] = match;

    handlers.push({
      name: 'execute',
      eventType,
      filePath,
      signature: `execute(event: ${eventType})${returnType ? `: ${returnType.trim()}` : ''}`,
    });
  }

  return handlers;
}
