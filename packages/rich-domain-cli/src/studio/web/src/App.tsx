import { useEffect, useState, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useStudioStore } from "./store";
import Sidebar from "./components/Sidebar";
import Console from "./components/Console";
import Header from "./components/Header";
import { DomainEntity, DomainStructure, EnumInfo } from "./interfaces";

type ConsolePosition = "bottom" | "right";

const DEFAULT_CODE = `// Welcome to Rich Domain Studio! 🎨
// Click on an entity in the sidebar to generate example code
// All Rich Domain classes are available globally!

// Example: Create a new Id
const id = new Id()
console.log("Generated ID:", id.value)
console.log("Is new:", id.isNew)
`;

const STORAGE_KEY = "rich-domain-studio-code";

export default function App() {
  const { domain, output, loading, fetchDomain, executeCode } =
    useStudioStore();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isExecuting, setIsExecuting] = useState(false);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [savedCode, setSavedCode] = useState<Record<string, string>>({});
  const [consolePosition, setConsolePosition] = useState<ConsolePosition>("bottom");
  const [consoleSize, setConsoleSize] = useState(30); // percentage
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved code from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedCode(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load saved code:", e);
    }
  }, []);

  // Save code to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(savedCode).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCode));
      } catch (e) {
        console.error("Failed to save code:", e);
      }
    }
  }, [savedCode]);

  // Fetch domain structure on mount
  useEffect(() => {
    fetchDomain();
  }, [fetchDomain]);

  useEffect(() => {
    if (domain && monacoInstance) {
      updateMonacoTypes(monacoInstance, domain);
    }
  }, [domain, monacoInstance]);

  const handleRun = useCallback(async () => {
    setIsExecuting(true);
    try {
      await executeCode(code);
    } finally {
      setIsExecuting(false);
    }
  }, [code, executeCode]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    if (consolePosition === "bottom") {
      // Calculate from top of container
      const mousePositionFromTop = e.clientY - rect.top;
      const editorSize = (mousePositionFromTop / rect.height) * 100;
      const newConsoleSize = 100 - editorSize;
      setConsoleSize(Math.max(15, Math.min(70, newConsoleSize)));
    } else {
      // Calculate from left of container
      const mousePositionFromLeft = e.clientX - rect.left;
      const editorSize = (mousePositionFromLeft / rect.width) * 100;
      const newConsoleSize = 100 - editorSize;
      setConsoleSize(Math.max(15, Math.min(70, newConsoleSize)));
    }
  }, [consolePosition]);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = () => {
    isResizing.current = true;
    document.body.style.cursor = consolePosition === "bottom" ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleEntityClick = (entity: DomainEntity) => {
    // Save current code for the current entity before switching
    if (selectedEntity) {
      setSavedCode((prev) => ({
        ...prev,
        [selectedEntity]: code,
      }));
    }

    // Check if we have saved code for this entity
    const hasSavedCode = savedCode[entity.name];
    const exampleCode = hasSavedCode || generateExampleCode(entity, domain?.enums || []);

    setSelectedEntity(entity.name);
    setCode(exampleCode);
  };

  const handleReset = () => {
    if (selectedEntity && domain) {
      const entity = domain.entities.find((e) => e.name === selectedEntity);
      if (entity) {
        const exampleCode = generateExampleCode(entity, domain.enums || []);
        setCode(exampleCode);
        // Remove saved code for this entity
        setSavedCode((prev) => {
          const newSaved = { ...prev };
          delete newSaved[selectedEntity];
          return newSaved;
        });
      }
    } else {
      // Reset to default code
      setCode(DEFAULT_CODE);
      setSelectedEntity(null);
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    setMonacoInstance(monaco);

    // Configure editor
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: "on",
      roundedSelection: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // Register Ctrl+Enter command to run code
    editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
      ],
      run: () => {
        handleRun();
      }
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    });

    // Compiler options for better IntelliSense
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      lib: ["es2020", "dom"],
      baseUrl: ".",
      paths: {
        "*": ["*", "src/*"]
      }
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ES2015,
      lib: ["es2020", "dom"],
      strict: false,
      esModuleInterop: true,
      baseUrl: ".",
      paths: {
        "*": ["*", "src/*"]
      }
    });

    if (domain) {
      updateMonacoTypes(monaco, domain);
    }
  };

  const editorPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <span className="text-sm text-gray-400">Playground</span>
      </div>
      <div className="flex-1 overflow-auto">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || "")}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            tabSize: 2,
            wordWrap: "on",
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <Sidebar
        domain={domain}
        loading={loading}
        onEntityClick={handleEntityClick}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          onRun={handleRun}
          onReset={handleReset}
          isExecuting={isExecuting}
          consolePosition={consolePosition}
          onConsolePositionChange={setConsolePosition}
        />

        {/* Editor and Console */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-hidden flex ${
            consolePosition === "bottom" ? "flex-col" : "flex-row"
          }`}
        >
          {/* Editor Panel */}
          <div
            className="overflow-hidden"
            style={{
              [consolePosition === "bottom" ? "height" : "width"]: `${100 - consoleSize}%`,
            }}
          >
            {editorPanel}
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`
              bg-gray-800 hover:bg-gray-600 transition-colors
              flex items-center justify-center group
              ${consolePosition === "bottom"
                ? "h-1 cursor-row-resize w-full"
                : "w-1 cursor-col-resize h-full"
              }
            `}
          >
            <div
              className={`
                bg-gray-700 rounded-full group-hover:bg-gray-500 transition-colors
                ${consolePosition === "bottom" ? "w-8 h-0.5" : "h-8 w-0.5"}
              `}
            />
          </div>

          {/* Console Panel */}
          <div
            className="overflow-hidden"
            style={{
              [consolePosition === "bottom" ? "height" : "width"]: `${consoleSize}%`,
            }}
          >
            <Console output={output} />
          </div>
        </div>
      </div>
    </div>
  );
}

function generateExampleCode(entity: DomainEntity, globalEnums: EnumInfo[]): string {
  const { name, type, methods, properties, enums } = entity;
  const varName = name.charAt(0).toLowerCase() + name.slice(1);

  // Create a map of enum names to their first value for quick lookup
  // Merge entity enums and global enums
  const enumValuesMap = new Map<string, string>();

  [...enums, ...globalEnums].forEach((enumInfo) => {
    if (enumInfo.values.length > 0 && !enumValuesMap.has(enumInfo.name)) {
      enumValuesMap.set(enumInfo.name, enumInfo.values[0]);
    }
  });

  // Generate example values based on property types
  const generateExampleValue = (propType: string): string => {
    // Check for enum union types like "active" | "inactive"
    if (propType.includes('" | "')) {
      // Extract first enum value
      const firstValue = propType.match(/"(\w+)"/)?.[1];
      if (firstValue) {
        return `"${firstValue}"`;
      }
    }

    // Check for TypeScript enum reference
    if (propType.match(/^[A-Z]\w+$/) && !["Date", "Id"].includes(propType)) {
      // Check if we have this enum's values
      const firstValue = enumValuesMap.get(propType);
      if (firstValue) {
        // Check if it's a string enum value or numeric
        if (firstValue.match(/^[A-Z_]+$/)) {
          // It's an enum key (like ADMIN, USER), use enum syntax
          return `${propType}.${firstValue}`;
        } else {
          // It's a string value, use it directly
          return `"${firstValue}"`;
        }
      }
      // Enum not found, comment it out
      return `"" as any as ${propType} // TODO: Select ${propType} value`;
    }

    if (propType.includes("string")) return `"Example string"`;
    if (propType.includes("number")) return "42";
    if (propType.includes("boolean")) return "true";
    if (propType.includes("Date")) return "new Date()";
    if (propType.includes("Id")) return "new Id()";
    if (propType.includes("[]")) return "[]";
    return `null // TODO: provide ${propType}`;
  };

  if (type === "value-object") {
    // Generate properties for value object
    const propLines = properties
      .map((p) => {
        const value = generateExampleValue(p.type);
        // If it's an enum or custom type that needs manual input, comment it
        if (value.includes("TODO") || value.includes("as any")) {
          return `    // ${p.name}: ${p.type}, // TODO: Provide ${p.type} value`;
        }
        return `    ${p.name}: ${value},`;
      })
      .join("\n");

    return `// ${name} - Value Object
// (Classes are available globally - no imports needed!)

try {
  const ${varName} = new ${name}({
${propLines || "    // No properties defined"}
  })

  console.log("✅ ${name} created successfully")
  console.log("Value:", ${varName})
} catch (error) {
  console.error("❌ Validation failed:", error.message)
}
`;
  }

  // Entity ou Aggregate
  // Generate property examples
  const propLines = properties
    .filter((p) => p.name !== "id") // id is added separately
    .map((p) => {
      const value = generateExampleValue(p.type);
      // If it's an enum or custom type that needs manual input, comment it
      if (value.includes("TODO") || value.includes("as any")) {
        return `    // ${p.name}: ${p.type}, // TODO: Provide ${p.type} value`;
      }
      return `    ${p.name}: ${value},`;
    })
    .join("\n");

  // Extract just method calls without TypeScript types for examples
  const methodExamples = methods
    .filter((m) => !["constructor", "toJSON", "clone"].includes(m.name))
    .slice(0, 2)
    .map((m) => {
      // Extract just the method name and params without types
      const paramMatch = m.signature.match(/\((.*?)\):/);
      const params = paramMatch ? paramMatch[1] : "";
      // Remove type annotations from params
      const paramNames = params
        .split(",")
        .map((p) => p.split(":")[0].trim())
        .filter(Boolean)
        .join(", ");
      return `  // ${varName}.${m.name}(${paramNames})`;
    })
    .join("\n");

  const hasMethodExamples = methodExamples.length > 0;

  return `// ${name} - ${type === "aggregate" ? "Aggregate Root" : "Entity"}
// (Classes are available globally - no imports needed!)

try {
  const ${varName} = new ${name}({
    id: new Id(), // Generates new UUID
${propLines}
  })

  console.log("✅ ${name} created successfully")
  console.log("ID:", ${varName}.id.value)
${hasMethodExamples ? "\n  // Available methods:\n" + methodExamples : ""}

  // Track changes automatically
  // ${varName}.someProperty = "new value"
  // const changes = ${varName}.getChanges()

} catch (error) {
  console.error("❌ Validation failed:", error.message)
}
`;
}

function updateMonacoTypes(monaco: any, domain: DomainStructure) {
  console.log("Updating Monaco types for", domain.entities.length, "entities");
  console.log("Total enums found:", domain.enums?.length || 0);
  if (domain.enums) {
    domain.enums.forEach(e => console.log(`  - ${e.name}:`, e.values));
  }

  // Build all type declarations as global declarations (no modules)
  let allDeclarations = `
// Rich Domain Library Types (Global)
declare namespace RichDomain {
  export class Id {
    constructor(value?: string);
    static from(value: string): Id;
    readonly value: string;
    readonly isNew: boolean;
    equals(id: Id): boolean;
  }

  export interface BaseProps {
    id: Id;
  }

  export class Entity<Props extends BaseProps = any> {
    constructor(props: Props);
    readonly id: Id;
    readonly props: Props;
    getChanges(): ChangeTracker;
    toJSON(): any;
    subscribe(subscriptions: any): void;
  }

  export class Aggregate<Props extends BaseProps = any> extends Entity<Props> {
    constructor(props: Props);
  }

  export class ValueObject<Props = any> {
    constructor(props: Props);
    readonly props: Props;
    clone(props: Partial<Props>): this;
    equals(vo: ValueObject<Props>): boolean;
  }

  export class ValidationError extends Error {
    readonly issues: Array<{ path: string[]; message: string }>;
  }

  export interface ChangeTracker {
    hasCreates(): boolean;
    hasUpdates(): boolean;
    hasDeletes(): boolean;
    toBatchOperations(): any;
  }
}

// Make RichDomain classes available globally
declare const Id: typeof RichDomain.Id;
declare const Entity: typeof RichDomain.Entity;
declare const Aggregate: typeof RichDomain.Aggregate;
declare const ValueObject: typeof RichDomain.ValueObject;
declare const ValidationError: typeof RichDomain.ValidationError;
declare type BaseProps = RichDomain.BaseProps;
declare type ChangeTracker = RichDomain.ChangeTracker;

`;

  // Declare enum types with their actual values
  if (domain.enums && domain.enums.length > 0) {
    allDeclarations += `\n// Enum types from your domain\n`;
    domain.enums.forEach((enumInfo) => {
      allDeclarations += `declare enum ${enumInfo.name} {\n`;
      enumInfo.values.forEach((value, index) => {
        // If value looks like an uppercase constant (e.g., ADMIN), use it as key
        // Otherwise, create a PascalCase key from the value
        const key = value.match(/^[A-Z_]+$/) ? value :
                    value.charAt(0).toUpperCase() + value.slice(1).replace(/[^a-zA-Z0-9]/g, '');
        const isLast = index === enumInfo.values.length - 1;

        // Check if it's a string value that needs quotes
        if (value.match(/^[A-Z_]+$/)) {
          // Numeric or auto-incremented enum
          allDeclarations += `  ${value}${isLast ? '' : ','}\n`;
        } else {
          // String enum
          allDeclarations += `  ${key} = "${value}"${isLast ? '' : ','}\n`;
        }
      });
      allDeclarations += `}\n\n`;
    });
  }

  // Add entity declarations as global types
  domain.entities.forEach((entity) => {
    console.log(`Declaring global class: ${entity.name}`);

    const baseClass =
      entity.type === "value-object" ? "ValueObject" :
      entity.type === "aggregate" ? "Aggregate" :
      "Entity";

    const propsInterfaceName = `${entity.name}Props`;

    // Filter out common inherited methods
    const customMethods = entity.methods.filter(
      (m) => !["constructor", "toJSON", "clone", "equals", "getChanges", "subscribe"].includes(m.name)
    );

    const methodDeclarations = customMethods
      .map((m) => `  ${m.signature};`)
      .join("\n");

    // Generate property declarations
    const propertyDeclarations = entity.properties
      .filter((p) => p.name !== "id") // id is already in BaseProps
      .map((p) => `  ${p.name}${p.optional ? "?" : ""}: ${p.type};`)
      .join("\n");

    if (entity.type === "value-object") {
      allDeclarations += `
// ${entity.name} - Value Object
interface ${propsInterfaceName} {
${propertyDeclarations || "  [key: string]: any;"}
}

declare class ${entity.name} extends ValueObject<${propsInterfaceName}> {
  constructor(props: ${propsInterfaceName});
  readonly props: ${propsInterfaceName};
${methodDeclarations}
}

`;
    } else {
      allDeclarations += `
// ${entity.name} - ${entity.type === "aggregate" ? "Aggregate" : "Entity"}
interface ${propsInterfaceName} extends BaseProps {
  id: Id;
${propertyDeclarations}
}

declare class ${entity.name} extends ${baseClass}<${propsInterfaceName}> {
  constructor(props: ${propsInterfaceName});
  readonly id: Id;
  readonly props: ${propsInterfaceName};
${methodDeclarations}
}

`;
    }
  });

  // Clear previous libs
  monaco.languages.typescript.javascriptDefaults.setExtraLibs([]);
  monaco.languages.typescript.typescriptDefaults.setExtraLibs([]);

  // Add all declarations as a single lib
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    allDeclarations,
    "ts:filename/global.d.ts"
  );

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    allDeclarations,
    "ts:filename/global.d.ts"
  );
}
