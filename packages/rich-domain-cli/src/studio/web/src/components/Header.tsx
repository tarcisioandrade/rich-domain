import { cn } from "../lib/utils";
import { Code2, Zap, Network } from "lucide-react";
// @ts-ignore
import Logo from "../../assets/dark.svg";

type ConsolePosition = "bottom" | "right";
type ViewMode = "entities" | "events" | "diagram";

interface HeaderProps {
  onRun: () => void;
  onReset: () => void;
  isExecuting: boolean;
  consolePosition: ConsolePosition;
  onConsolePositionChange: (position: ConsolePosition) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function Header({
  onRun,
  onReset,
  isExecuting,
  consolePosition,
  onConsolePositionChange,
  viewMode,
  onViewModeChange,
}: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <div className="w-44">
          <img src={Logo} alt="Rich Domain Studio" className="size-full" />
        </div>
        <div className="h-5 w-px bg-border" />

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-secondary rounded p-1">
          <button
            onClick={() => onViewModeChange("entities")}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5",
              viewMode === "entities"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Entities View"
          >
            <Code2 className="size-3.5" />
            Entities
          </button>
          <button
            onClick={() => onViewModeChange("events")}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5",
              viewMode === "events"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Events View"
          >
            <Zap className="size-3.5" />
            Events
          </button>
          <button
            onClick={() => onViewModeChange("diagram")}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5",
              viewMode === "diagram"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Diagram View"
          >
            <Network className="size-3.5" />
            Diagram
          </button>
        </div>
      </div>

      {viewMode === "entities" && (
        <div className="flex items-center gap-3">
          <button
            onClick={onRun}
            disabled={isExecuting}
            className={cn(
              "px-4 py-2 rounded font-medium transition-colors flex items-center gap-2",
              isExecuting
                ? "bg-accent text-accent-foreground cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 text-white"
            )}
          >
            {isExecuting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Running...
              </>
            ) : (
              <>
                <span>▶</span>
                Run
              </>
            )}
          </button>

          <button
            onClick={onReset}
            className="px-4 py-2 rounded font-medium transition-all flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            title="Reset to generated code"
          >
            <span>↺</span>
            Reset
          </button>

          <div className="text-gray-500 text-xs" title="Keyboard shortcut">
            <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 font-mono">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter
            </kbd>
          </div>

          <div className="h-6 w-px bg-gray-600 mx-2" />

          {/* Console Position Controls */}
          <div className="flex items-center gap-1 bg-secondary rounded p-1">
            <button
              onClick={() => onConsolePositionChange("bottom")}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                consolePosition === "bottom"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-muted-foreground/80"
              }`}
              title="Console at bottom"
            >
              ⬇
            </button>
            <button
              onClick={() => onConsolePositionChange("right")}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                consolePosition === "right"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-muted-foreground/80"
              }`}
              title="Console on right"
            >
              ➡
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
