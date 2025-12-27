interface HeaderProps {
  onRun: () => void;
  isExecuting: boolean;
}

export default function Header({ onRun, isExecuting }: HeaderProps) {
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
          className="text-gray-400 hover:text-gray-300 transition-colors"
          title="Keyboard shortcut: Ctrl/Cmd + Enter"
        >
          <kbd className="text-xs bg-gray-700 px-2 py-1 rounded">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter
          </kbd>
        </button>
      </div>
    </div>
  );
}
