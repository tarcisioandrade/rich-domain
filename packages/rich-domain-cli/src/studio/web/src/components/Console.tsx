interface ExecutionOutput {
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

interface ConsoleProps {
  output: ExecutionOutput | null;
}

export default function Console({ output }: ConsoleProps) {
  if (!output) {
    return (
      <div className="h-64 bg-gray-850 border-t border-gray-700">
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
          <span className="text-sm text-gray-400">Console</span>
        </div>
        <div className="p-4 text-sm text-gray-500">
          <p>Press the Run button to execute your code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-gray-850 border-t border-gray-700 flex flex-col">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-400">Console</span>
        {output.success ? (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <span>✓</span> Success
          </span>
        ) : (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <span>✗</span> Error
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2">
        {/* Logs */}
        {output.logs && output.logs.length > 0 && (
          <div className="space-y-1">
            {output.logs.map((log, index) => (
              <div key={index} className="text-gray-300">
                {log}
              </div>
            ))}
          </div>
        )}

        {/* Output */}
        {output.output !== undefined && (
          <div className="bg-gray-800 rounded p-3 border border-gray-700">
            <div className="text-xs text-gray-500 mb-1">Output:</div>
            <pre className="text-green-400 whitespace-pre-wrap">
              {JSON.stringify(output.output, null, 2)}
            </pre>
          </div>
        )}

        {/* Validation Errors */}
        {output.validationErrors && output.validationErrors.length > 0 && (
          <div className="space-y-2">
            <div className="text-red-400 font-semibold">
              ❌ Validation Failed ({output.validationErrors.length} errors)
            </div>
            {output.validationErrors.map((error, index) => (
              <div
                key={index}
                className="bg-red-900/20 border border-red-500/30 rounded p-3"
              >
                <div className="text-red-400 font-medium mb-1">
                  📍 {error.path}
                </div>
                <div className="text-red-300 text-sm mb-2">{error.message}</div>
                {error.expected !== undefined && (
                  <div className="text-xs text-gray-400">
                    Expected: {JSON.stringify(error.expected)}
                  </div>
                )}
                {error.received !== undefined && (
                  <div className="text-xs text-gray-400">
                    Received: {JSON.stringify(error.received)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Runtime Errors */}
        {output.errors && output.errors.length > 0 && (
          <div className="space-y-2">
            {output.errors.map((error, index) => (
              <div
                key={index}
                className="bg-red-900/20 border border-red-500/30 rounded p-3"
              >
                <div className="text-red-400 font-medium mb-1">
                  ❌ Runtime Error
                  {error.line && (
                    <span className="text-sm ml-2">at line {error.line}</span>
                  )}
                </div>
                <div className="text-red-300 text-sm">{error.message}</div>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Stack trace
                    </summary>
                    <pre className="mt-2 text-xs text-gray-400 overflow-x-auto">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
