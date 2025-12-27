type ConsolePosition = "bottom" | "right";

interface HeaderProps {
  onRun: () => void;
  onReset: () => void;
  isExecuting: boolean;
  consolePosition: ConsolePosition;
  onConsolePositionChange: (position: ConsolePosition) => void;
}

export default function Header({
  onRun,
  onReset,
  isExecuting,
  consolePosition,
  onConsolePositionChange,
}: HeaderProps) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-100">
          🎨 Rich Domain Studio
        </h1>
        <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
          Interactive Playground
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRun}
          disabled={isExecuting}
          className={`
            px-4 py-2 rounded font-medium transition-all
            flex items-center gap-2
            ${
              isExecuting
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/50"
            }
          `}
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
          className="px-4 py-2 rounded font-medium transition-all flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300"
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
        <div className="flex items-center gap-1 bg-gray-700 rounded p-1">
          <button
            onClick={() => onConsolePositionChange("bottom")}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              consolePosition === "bottom"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
            title="Console at bottom"
          >
            ⬇
          </button>
          <button
            onClick={() => onConsolePositionChange("right")}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              consolePosition === "right"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
            title="Console on right"
          >
            ➡
          </button>
        </div>
      </div>
    </div>
  );
}
