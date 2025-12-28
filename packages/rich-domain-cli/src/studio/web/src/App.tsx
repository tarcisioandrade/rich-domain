import { useEffect, useState, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useStudioStore } from "./store";
import Sidebar from "./components/Sidebar";
import Console from "./components/Console";
import Tabs from "./components/Tabs";
import EventsPanel from "./components/EventsPanel";
import EventDetails from "./components/EventDetails";
import EntityDiagram from "./components/EntityDiagram";
import {
  DomainEntity,
  DomainStructure,
  DomainEventInfo,
  EnumInfo,
  TabState,
  ConsolePosition,
  EntityType,
} from "./interfaces";
import Header from "./components/Header";

type ViewMode = "entities" | "events" | "diagram";

const DEFAULT_CODE = `// Welcome to Rich Domain Studio! 🎨
// Click on an entity in the sidebar to generate example code
// All Rich Domain classes are available globally!

// Example: Create a new Id
const id = new Id()
console.log("Generated ID:", id.value)
console.log("Is new:", id.isNew)
`;

const TABS_STORAGE_KEY = "rich-domain-studio-tabs";
const ACTIVE_TAB_STORAGE_KEY = "rich-domain-studio-active-tab";
const CONSOLE_POSITION_STORAGE_KEY = "rich-domain-studio-console-position";

// Helper to get view mode from URL hash
function getViewModeFromHash(): ViewMode {
  const hash = window.location.hash.slice(1); // Remove #
  if (hash === "diagram" || hash === "events" || hash === "entities") {
    return hash as ViewMode;
  }
  return "entities";
}

// Helper to update URL hash
function updateHashForViewMode(mode: ViewMode) {
  window.location.hash = mode;
}

// Helper function to generate unique tab IDs
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to create a new tab
function createNewTab(
  entityName: string | null = null,
  entityType: EntityType | null = null,
  code: string = DEFAULT_CODE
): TabState {
  return {
    id: generateTabId(),
    entityName,
    entityType,
    code,
    label: entityName || "Playground",
  };
}

export default function App() {
  const { domain, output, loading, fetchDomain, executeCode } =
    useStudioStore();
  const [tabs, setTabs] = useState<TabState[]>([createNewTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [isExecuting, setIsExecuting] = useState(false);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);
  const [consolePosition, setConsolePosition] =
    useState<ConsolePosition>("right");
  const [consoleSize, setConsoleSize] = useState(30); // percentage
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    getViewModeFromHash()
  );
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current active tab
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  // Load saved tabs and console position from localStorage on mount
  useEffect(() => {
    try {
      const storedTabs = localStorage.getItem(TABS_STORAGE_KEY);
      const storedActiveTabId = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      const storedConsolePosition = localStorage.getItem(
        CONSOLE_POSITION_STORAGE_KEY
      );

      if (storedTabs) {
        const parsedTabs = JSON.parse(storedTabs) as TabState[];
        if (parsedTabs.length > 0) {
          setTabs(parsedTabs);

          // Restore active tab if it exists in the loaded tabs
          if (
            storedActiveTabId &&
            parsedTabs.some((t) => t.id === storedActiveTabId)
          ) {
            setActiveTabId(storedActiveTabId);
          } else {
            setActiveTabId(parsedTabs[0].id);
          }
        }
      }

      // Restore console position
      if (
        storedConsolePosition === "bottom" ||
        storedConsolePosition === "right"
      ) {
        setConsolePosition(storedConsolePosition as ConsolePosition);
      }
    } catch (e) {
      console.error("Failed to load saved state:", e);
    }
  }, []);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
    } catch (e) {
      console.error("Failed to save tabs:", e);
    }
  }, [tabs, activeTabId]);

  // Save console position to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CONSOLE_POSITION_STORAGE_KEY, consolePosition);
    } catch (e) {
      console.error("Failed to save console position:", e);
    }
  }, [consolePosition]);

  // Fetch domain structure on mount
  useEffect(() => {
    fetchDomain();
  }, [fetchDomain]);

  // Sync viewMode with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const newMode = getViewModeFromHash();
      setViewMode(newMode);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (domain && monacoInstance) {
      updateMonacoTypes(monacoInstance, domain);
    }
  }, [domain, monacoInstance]);

  const handleRun = useCallback(async () => {
    setIsExecuting(true);
    try {
      await executeCode(activeTab.code);
    } finally {
      setIsExecuting(false);
    }
  }, [activeTab.code, executeCode]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
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
    },
    [consolePosition]
  );

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = () => {
    isResizing.current = true;
    document.body.style.cursor =
      consolePosition === "bottom" ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleEntityClick = (entity: DomainEntity) => {
    // Check if a tab with this entity already exists
    const existingTab = tabs.find((tab) => tab.entityName === entity.name);

    if (existingTab) {
      // Switch to existing tab
      setActiveTabId(existingTab.id);
    } else {
      // Create a new tab for this entity
      const exampleCode = generateExampleCode(entity, domain?.enums || []);
      const newTab = createNewTab(entity.name, entity.type, exampleCode);
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleReset = () => {
    const currentTab = activeTab;

    if (currentTab.entityName && domain) {
      // Reset to entity example code
      const entity = domain.entities.find(
        (e) => e.name === currentTab.entityName
      );
      if (entity) {
        const exampleCode = generateExampleCode(entity, domain.enums || []);
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeTabId ? { ...tab, code: exampleCode } : tab
          )
        );
      }
    } else {
      // Reset to default code
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, code: DEFAULT_CODE } : tab
        )
      );
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleTabClose = (tabId: string) => {
    // Don't close if it's the last tab
    if (tabs.length === 1) return;

    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);

    setTabs((prev) => prev.filter((tab) => tab.id !== tabId));

    // If closing the active tab, switch to another tab
    if (tabId === activeTabId) {
      // Switch to the previous tab if available, otherwise next tab
      const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0;
      const newActiveTab =
        tabs[newActiveIndex === tabIndex ? newActiveIndex + 1 : newActiveIndex];
      if (newActiveTab) {
        setActiveTabId(newActiveTab.id);
      }
    }
  };

  const handleEventClick = (event: DomainEventInfo) => {
    setSelectedEvent(event.name);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    updateHashForViewMode(mode);
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, code: newCode } : tab
      )
    );
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
      id: "run-code",
      label: "Run Code",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        handleRun();
      },
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
        "*": ["*", "src/*"],
      },
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
        "*": ["*", "src/*"],
      },
    });

    if (domain) {
      updateMonacoTypes(monaco, domain);
    }
  };

  const editorPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
      />

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          value={activeTab.code}
          onChange={handleCodeChange}
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

  // Get selected event data
  const selectedEventData =
    selectedEvent && domain
      ? domain.events.find((e) => e.name === selectedEvent) || null
      : null;

  return (
    <main className="h-screen bg-background flex flex-col overflow-hidden">
      <Header
        onRun={handleRun}
        onReset={handleReset}
        isExecuting={isExecuting}
        consolePosition={consolePosition}
        onConsolePositionChange={setConsolePosition}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      <div className="flex flex-1 text-muted-foreground overflow-hidden">
        {/* Entities View */}
        {viewMode === "entities" && (
          <>
            {/* Sidebar */}
            <Sidebar
              domain={domain}
              loading={loading}
              selectedEntity={activeTab.entityName}
              onEntityClick={handleEntityClick}
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
                className="overflow-hidden flex-shrink-0"
                style={{
                  [consolePosition === "bottom" ? "height" : "width"]: `${
                    100 - consoleSize
                  }%`,
                }}
              >
                {editorPanel}
              </div>

              {/* Resize Handle */}
              <div
                onMouseDown={handleMouseDown}
                className={`
                  bg-secondary hover:bg-secondary/80 transition-colors
                  flex items-center justify-center group
                  ${
                    consolePosition === "bottom"
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
                className="overflow-hidden flex-shrink-0"
                style={{
                  [consolePosition === "bottom"
                    ? "height"
                    : "width"]: `${consoleSize}%`,
                }}
              >
                <Console output={output} />
              </div>
            </div>
          </>
        )}

        {/* Events View */}
        {viewMode === "events" && (
          <>
            <EventsPanel
              domain={domain}
              loading={loading}
              selectedEvent={selectedEvent}
              onEventClick={handleEventClick}
            />
            <EventDetails event={selectedEventData} />
          </>
        )}

        {/* Diagram View */}
        {viewMode === "diagram" && domain && (
          <EntityDiagram
            entities={domain.entities}
            contexts={domain.contexts}
            onEntityClick={(entity) => {
              // Switch to entities view and open the clicked entity
              setViewMode("entities");
              handleEntityClick(entity);
            }}
          />
        )}
      </div>
    </main>
  );
}

function generateExampleCode(
  entity: DomainEntity,
  globalEnums: EnumInfo[]
): string {
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

  // Build all type declarations as global declarations (no modules)
  let allDeclarations = `
// Rich Domain Library Types (Global)
declare namespace RichDomain {
  export class Id {
    constructor(value?: string);
    static from(value: string): Id;
    static create(): Id;
    readonly value: string;
    isNew(): boolean;
    equals(other: Id | string): boolean;
    toString(): string;
    toJSON(): string;
  }

  export interface BaseProps {
    id: Id;
  }

  export interface HistoryEntry {
    path: string;
    oldValue: any;
    newValue: any;
    timestamp: Date;
  }

  export interface IDomainEvent {
    readonly occurredOn: Date;
    readonly eventName: string;
  }

  export interface IDomainEventBus {
    publishAll(events: IDomainEvent[]): Promise<void>;
  }

  export interface AggregateChanges<TEntityMap = Record<string, any>> {
    hasCreates(): boolean;
    hasUpdates(): boolean;
    hasDeletes(): boolean;
    toBatchOperations(): any;
  }

  export class Entity<Props extends BaseProps = any> {
    constructor(props: Omit<Props, 'id'> & { id?: Id });
    readonly id: Id;
    readonly props: Props;
    isNew(): boolean;
    equals(other: Entity<Props> | Id | string): boolean;
    readonly hasValidationErrors: boolean;
    readonly validationErrors: ValidationError | undefined;
    getChanges<TEntityMap = Record<string, any>>(): AggregateChanges<TEntityMap>;
    getHistory(): HistoryEntry[];
    markAsClean(): void;
    dispatchAll(bus: IDomainEventBus): Promise<void>;
    getUncommittedEvents(): IDomainEvent[];
    clearEvents(): void;
    hasUncommittedEvents(): boolean;
    toJSON(): any;
  }

  export class Aggregate<Props extends BaseProps = any> extends Entity<Props> {
    constructor(props: Omit<Props, 'id'> & { id?: Id });
  }

  export class ValueObject<Props = any> {
    constructor(props: Props);
    readonly props: Props;
    equals(other: ValueObject<Props>): boolean;
    getIdentityKey(): string | null;
    hasIdentityKey(): boolean;
    getUncommittedEvents(): IDomainEvent[];
    clearEvents(): void;
    hasUncommittedEvents(): boolean;
    readonly hasValidationErrors: boolean;
    readonly validationErrors: ValidationError | undefined;
    toJSON(): Props;
  }

  export class ValidationError extends Error {
    readonly issues: Array<{ path: string[]; message: string }>;
  }
}

// Make RichDomain classes available globally
declare const Id: typeof RichDomain.Id;
declare const Entity: typeof RichDomain.Entity;
declare const Aggregate: typeof RichDomain.Aggregate;
declare const ValueObject: typeof RichDomain.ValueObject;
declare const ValidationError: typeof RichDomain.ValidationError;
declare type BaseProps = RichDomain.BaseProps;
declare type HistoryEntry = RichDomain.HistoryEntry;
declare type IDomainEvent = RichDomain.IDomainEvent;
declare type IDomainEventBus = RichDomain.IDomainEventBus;
declare type AggregateChanges<TEntityMap = Record<string, any>> = RichDomain.AggregateChanges<TEntityMap>;

`;

  // Declare enum types with their actual values
  if (domain.enums && domain.enums.length > 0) {
    allDeclarations += `\n// Enum types from your domain\n`;
    domain.enums.forEach((enumInfo) => {
      allDeclarations += `declare enum ${enumInfo.name} {\n`;
      enumInfo.values.forEach((value, index) => {
        // If value looks like an uppercase constant (e.g., ADMIN), use it as key
        // Otherwise, create a PascalCase key from the value
        const key = value.match(/^[A-Z_]+$/)
          ? value
          : value.charAt(0).toUpperCase() +
            value.slice(1).replace(/[^a-zA-Z0-9]/g, "");
        const isLast = index === enumInfo.values.length - 1;

        // Check if it's a string value that needs quotes
        if (value.match(/^[A-Z_]+$/)) {
          // Numeric or auto-incremented enum
          allDeclarations += `  ${value}${isLast ? "" : ","}\n`;
        } else {
          // String enum
          allDeclarations += `  ${key} = "${value}"${isLast ? "" : ","}\n`;
        }
      });
      allDeclarations += `}\n\n`;
    });
  }

  // Add entity declarations as global types
  domain.entities.forEach((entity) => {
    const baseClass =
      entity.type === "value-object"
        ? "ValueObject"
        : entity.type === "aggregate"
        ? "Aggregate"
        : "Entity";

    const propsInterfaceName = `${entity.name}Props`;

    // Filter out common inherited methods
    const customMethods = entity.methods.filter(
      (m) =>
        ![
          "constructor",
          "toJSON",
          "clone",
          "equals",
          "getChanges",
          "subscribe",
        ].includes(m.name)
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
