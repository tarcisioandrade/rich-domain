import { useState } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { EventState, TrackedEvent } from "../interfaces";

interface EventTrackerDetailsProps {
  event: TrackedEvent | null;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded hover:bg-muted transition-colors"
      title={label || "Copy"}
    >
      {copied ? (
        <Check className="size-3 text-green-400" />
      ) : (
        <Copy className="size-3 text-muted-foreground hover:text-foreground" />
      )}
    </button>
  );
}

export default function EventTrackerDetails({
  event,
}: EventTrackerDetailsProps) {
  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="size-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select an event to view details</p>
        </div>
      </div>
    );
  }

  const getStateColor = (state: EventState): string => {
    const colors: Record<EventState, string> = {
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      active: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      succeeded: "bg-green-500/20 text-green-300 border-green-500/30",
      failed: "bg-red-500/20 text-red-300 border-red-500/30",
      delayed: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      retrying: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      unknown: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    };
    return colors[state] || colors.unknown;
  };

  const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatJSON = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Event Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold font-mono mb-2">
                {event.eventName}
              </h1>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded text-sm font-medium border ${getStateColor(
                    event.state
                  )}`}
                >
                  {event.state.toUpperCase()}
                </span>
                {event.queueName && (
                  <span className="px-3 py-1 rounded text-sm bg-secondary border border-secondary text-white">
                    {event.queueName}
                  </span>
                )}
                {event.retryCount && event.retryCount > 0 && (
                  <span className="px-3 py-1 rounded text-sm bg-orange-500/20 border border-orange-500/30 text-orange-300">
                    {event.retryCount}{" "}
                    {event.retryCount === 1 ? "retry" : "retries"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center">
              <span className="font-semibold w-24">Event ID:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded text-white">
                {event.eventId}
              </code>
              <CopyButton text={event.eventId} label="Copy event ID" />
            </div>
            {event.jobId && (
              <div className="flex items-center">
                <span className="font-semibold w-24">Job ID:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded text-white">
                  {event.jobId}
                </code>
                <CopyButton text={event.jobId} label="Copy job ID" />
              </div>
            )}
            <div className="flex items-center">
              <span className="font-semibold w-24">Occurred:</span>
              <span className="text-white">{formatDate(event.occurredOn)}</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold w-24">Created:</span>
              <span className="text-white">{formatDate(event.createdAt)}</span>
            </div>
            {event.updatedAt && (
              <div className="flex items-center">
                <span className="font-semibold w-24">Updated:</span>
                <span className="text-white">
                  {formatDate(event.updatedAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Event Payload Section */}
        <section className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-blue-400">📦</span>
              Event Payload
            </h2>
            <CopyButton text={formatJSON(event.payload)} label="Copy payload" />
          </div>

          <div className="rounded-md overflow-auto">
            <SyntaxHighlighter
              language="json"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: "0.75rem",
                fontSize: "0.75rem",
                background: "rgba(255, 255, 255, 0.05)",
              }}
            >
              {formatJSON(event.payload)}
            </SyntaxHighlighter>
          </div>
        </section>

        {/* Processing Metadata */}
        {event.metadata && (
          <section className="border border-border rounded-lg p-4 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-purple-400">⚙️</span>
              Processing Metadata
            </h2>

            <div className="space-y-3">
              {/* Attempts */}
              {event.metadata.attempts !== undefined &&
                event.metadata.attempts > 0 && (
                  <div className="bg-muted/30 rounded-md p-3">
                    <div className="text-sm font-semibold mb-1">
                      Attempts: {event.metadata.attempts}
                    </div>
                  </div>
                )}

              {/* Timestamps */}
              {(event.metadata.processedAt || event.metadata.finishedAt) && (
                <div className="bg-muted/30 rounded-md p-3 space-y-2">
                  {event.metadata.processedAt && (
                    <div className="text-sm">
                      <span className="font-semibold">Processed At: </span>
                      <span className="text-muted-foreground">
                        {formatDate(event.metadata.processedAt)}
                      </span>
                    </div>
                  )}
                  {event.metadata.finishedAt && (
                    <div className="text-sm">
                      <span className="font-semibold">Finished At: </span>
                      <span className="text-muted-foreground">
                        {formatDate(event.metadata.finishedAt)}
                      </span>
                    </div>
                  )}
                  {event.metadata.processedAt && event.metadata.finishedAt && (
                    <div className="text-sm">
                      <span className="font-semibold">Duration: </span>
                      <span className="text-green-400">
                        {(
                          (new Date(event.metadata.finishedAt).getTime() -
                            new Date(event.metadata.processedAt).getTime()) /
                          1000
                        ).toFixed(2)}
                        s
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Result */}
              {event.metadata.result !== undefined && (
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Result:</div>
                    <CopyButton
                      text={formatJSON(event.metadata.result)}
                      label="Copy result"
                    />
                  </div>

                  <div className="rounded overflow-auto max-h-64">
                    <SyntaxHighlighter
                      language="json"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: "0.5rem",
                        fontSize: "0.75rem",
                        background: "transparent",
                      }}
                    >
                      {formatJSON(event.metadata.result)}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Error Section */}
        {event.metadata?.error && (
          <section className="border border-red-500/30 rounded-lg p-4 space-y-3 bg-red-500/5">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-red-400">
              <AlertCircle className="size-5" />
              Error
            </h2>

            <div className="bg-red-500/10 rounded-md p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-red-400">
                    Error Message:
                  </div>
                  <CopyButton text={event.metadata.error} label="Copy error" />
                </div>
                <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap">
                  {event.metadata.error}
                </pre>
              </div>

              {event.metadata.stacktrace && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-red-400">
                      Stack Trace:
                    </div>
                    <CopyButton
                      text={event.metadata.stacktrace}
                      label="Copy stacktrace"
                    />
                  </div>
                  <pre className="text-xs font-mono text-red-300/70 whitespace-pre-wrap overflow-auto max-h-64">
                    {event.metadata.stacktrace}
                  </pre>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Raw Event Data */}
        <section className="border border-dashed border-border rounded-lg p-4 space-y-3 bg-muted/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Raw Event Data
            </h3>
            <CopyButton text={formatJSON(event)} label="Copy raw data" />
          </div>

          <div className="rounded-md overflow-auto max-h-96">
            <SyntaxHighlighter
              language="json"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: "1rem",
                fontSize: "0.75rem",
                background: "transparent",
              }}
            >
              {formatJSON(event)}
            </SyntaxHighlighter>
          </div>
        </section>
      </div>
    </div>
  );
}
