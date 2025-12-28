import { DomainEventInfo } from "../interfaces";
import { FileCode, Zap, Users, Radio, Copy, Check } from "lucide-react";
import { useState } from "react";

interface EventDetailsProps {
  event: DomainEventInfo | null;
}

function CopyPathButton({ filePath }: { filePath: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Convert path for Windows (replace / with \)
    const isWindows = navigator.platform.toLowerCase().includes('win');
    const pathToCopy = isWindows ? filePath.replace(/\//g, '\\') : filePath;

    try {
      await navigator.clipboard.writeText(pathToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded hover:bg-muted transition-colors"
      title="Copy file path"
    >
      {copied ? (
        <Check className="size-3 text-green-400" />
      ) : (
        <Copy className="size-3 text-muted-foreground hover:text-foreground" />
      )}
    </button>
  );
}

export default function EventDetails({ event }: EventDetailsProps) {
  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <Zap className="size-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select an event to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Event Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="size-6 text-yellow-400" />
            <h1 className="text-2xl font-bold font-mono">{event.name}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileCode className="size-4" />
            <code className="text-xs">{event.filePath}</code>
            <CopyPathButton filePath={event.filePath} />
          </div>
        </div>

        {/* Payload Section */}
        <section className="border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-blue-400">📦</span>
            Payload Type: <code className="text-sm text-primary">{event.payloadType}</code>
          </h2>

          {event.properties.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Properties:</p>
              <div className="bg-muted/30 rounded-md p-3 space-y-1.5">
                {event.properties.map((prop, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 font-mono text-sm"
                  >
                    <span className="text-foreground">{prop.name}</span>
                    <span className="text-muted-foreground">
                      {prop.optional ? "?:" : ":"}
                    </span>
                    <span className="text-blue-400">{prop.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No payload properties detected
            </p>
          )}
        </section>

        {/* Publishers Section */}
        <section className="border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="size-5 text-green-400" />
            Publishers
            <span className="text-sm font-normal text-muted-foreground">
              ({event.publishers.length})
            </span>
          </h2>

          {event.publishers.length > 0 ? (
            <div className="space-y-2">
              {event.publishers.map((publisher, index) => (
                <div
                  key={index}
                  className="bg-muted/30 rounded-md px-3 py-2 flex items-center gap-2"
                >
                  <div className="size-2 rounded-full bg-green-400"></div>
                  <code className="text-sm font-mono">{publisher}</code>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Entity
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/20 rounded-md px-3 py-2 text-sm text-muted-foreground italic">
              No publishers detected
            </div>
          )}
        </section>

        {/* Handlers Section */}
        <section className="border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="size-5 text-purple-400" />
            Event Handlers
            <span className="text-sm font-normal text-muted-foreground">
              ({event.handlers.length})
            </span>
          </h2>

          {event.handlers.length > 0 ? (
            <div className="space-y-3">
              {event.handlers.map((handler, index) => (
                <div
                  key={index}
                  className="bg-muted/30 rounded-md p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-purple-400"></div>
                    <code className="text-sm font-mono font-semibold">
                      {handler.name}
                    </code>
                  </div>

                  <div className="ml-4 space-y-1">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Signature: </span>
                      <code className="text-foreground bg-muted px-1.5 py-0.5 rounded">
                        {handler.signature}
                      </code>
                    </div>

                    <div className="text-xs flex items-center">
                      <span className="text-muted-foreground">File: </span>
                      <code className="text-foreground ml-1">{handler.filePath}</code>
                      <CopyPathButton filePath={handler.filePath} />
                    </div>

                    {handler.eventType !== event.name && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">
                          Event Type:{" "}
                        </span>
                        <code className="text-yellow-400">
                          {handler.eventType}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/20 rounded-md px-3 py-2 text-sm text-muted-foreground italic">
              No handlers detected
            </div>
          )}
        </section>

        {/* Summary */}
        <section className="border border-dashed border-border rounded-lg p-4 bg-muted/10">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            Event Flow Summary
          </h3>
          <p className="text-sm text-muted-foreground">
            This event is published by{" "}
            <span className="font-semibold text-foreground">
              {event.publishers.length}{" "}
              {event.publishers.length === 1 ? "entity" : "entities"}
            </span>
            {event.publishers.length > 0 && (
              <>
                {" "}
                ({event.publishers.join(", ")})
              </>
            )}
            {" and "}handled by{" "}
            <span className="font-semibold text-foreground">
              {event.handlers.length}{" "}
              {event.handlers.length === 1 ? "handler" : "handlers"}
            </span>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
