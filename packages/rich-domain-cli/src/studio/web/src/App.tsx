import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useStudioStore } from "./store";
import Sidebar from "./components/Sidebar";
import Console from "./components/Console";
import Header from "./components/Header";
import { DomainEntity, DomainStructure } from "./interfaces";

const DEFAULT_CODE = `// Welcome to Rich Domain Studio! 🎨
// Click on an entity in the sidebar to generate example code
// All Rich Domain classes are available globally!

// Example: Create a new Id
const id = new Id()
console.log("Generated ID:", id.value)
console.log("Is new:", id.isNew)
`;

export default function App() {
  const { domain, output, loading, fetchDomain, executeCode } =
    useStudioStore();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isExecuting, setIsExecuting] = useState(false);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);

  // Fetch domain structure on mount
  useEffect(() => {
    fetchDomain();
  }, [fetchDomain]);

  useEffect(() => {
    if (domain && monacoInstance) {
      updateMonacoTypes(monacoInstance, domain);
    }
  }, [domain, monacoInstance]);

  const handleRun = async () => {
    setIsExecuting(true);
    try {
      await executeCode(code);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEntityClick = (entity: DomainEntity) => {
    const exampleCode = generateExampleCode(entity);
    setCode(exampleCode);
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
        <Header onRun={handleRun} isExecuting={isExecuting} />

        {/* Editor Area */}
        <div className="flex-1 flex flex-col border-b border-gray-700">
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
            <span className="text-sm text-gray-400">Playground</span>
          </div>
          <div className="flex-1">
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
              }}
            />
          </div>
        </div>

        {/* Console Output */}
        <Console output={output} />
      </div>
    </div>
  );
}

function generateExampleCode(entity: DomainEntity): string {
  const { name, type, methods, properties } = entity;
  const varName = name.charAt(0).toLowerCase() + name.slice(1);

  // Generate example values based on property types
  const generateExampleValue = (propType: string): string => {
    if (propType.includes("string")) return `"Example ${propType}"`;
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
      .map((p) => `    ${p.name}: ${generateExampleValue(p.type)},`)
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
    .map((p) => `    ${p.name}: ${generateExampleValue(p.type)},`)
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
