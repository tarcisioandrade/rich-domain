import { useState } from "react";
import { DomainEntity } from "../interfaces";
import { X, FileCode, Box, Gem, Layers, Copy, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface EntityDetailDrawerProps {
  entity: DomainEntity | null;
  isOpen: boolean;
  onClose: () => void;
}

function getColorByPropertyType(type: string) {
  const colorMap = {
    string: "text-green-400",
    any: "text-cyan-400",
    number: "text-blue-400",
    boolean: "text-blue-500",
    Date: "text-purple-400",
    "string[]": "text-green-400",
    "number[]": "text-blue-400",
    "boolean[]": "text-blue-500",
    "Date[]": "text-purple-400",
    "any[]": "text-cyan-400",
  };

  const color = colorMap[type as keyof typeof colorMap];
  const isReferenceOrEnum = !color && type[0] === type[0].toUpperCase();

  const referenceColor = "text-green-500";

  return (
    color ?? (isReferenceOrEnum ? referenceColor : "text-muted-foreground")
  );
}

function CopyPathButton({ filePath }: { filePath: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const isWindows = navigator.platform.toLowerCase().includes("win");
    const pathToCopy = isWindows ? filePath.replace(/\//g, "\\") : filePath;

    try {
      await navigator.clipboard.writeText(pathToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy path:", err);
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
        <Copy className="size-3" />
      )}
    </button>
  );
}

export default function EntityDetailDrawer({
  entity,
  isOpen,
  onClose,
}: EntityDetailDrawerProps) {
  if (!isOpen || !entity) return null;

  const Icon =
    entity.type === "aggregate"
      ? Box
      : entity.type === "value-object"
      ? Gem
      : Layers;
  const iconColor =
    entity.type === "aggregate"
      ? "text-primary"
      : entity.type === "value-object"
      ? "text-emerald-400"
      : "text-blue-400";

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-lg z-20 flex flex-col animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-5", iconColor)} />
          <h2 className="font-semibold font-mono">{entity.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
          title="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Type & Context */}
        <section>
          <h3 className="text-sm font-semibold text-white mb-2">Info</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-mono">{entity.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Context:</span>
              <span className="font-mono text-primary">{entity.context}</span>
            </div>
          </div>
        </section>

        {/* File Path */}
        <section>
          <h3 className="text-sm font-semibold mb-2 text-white">Location</h3>
          <div className="flex items-center gap-2 text-xs bg-muted p-2 rounded">
            <FileCode className="size-3 flex-shrink-0" />
            <code className="flex-1 truncate">{entity.filePath}</code>
            <CopyPathButton filePath={entity.filePath} />
          </div>
        </section>

        {/* Properties */}
        <section>
          <h3 className="text-sm font-semibold text-white mb-2">
            Properties ({entity.properties.length})
          </h3>
          {entity.properties.length > 0 ? (
            <div className="bg-muted/30 rounded p-2 space-y-1">
              {entity.properties.map((prop, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs font-mono"
                >
                  <div>
                    <span>{prop.name}</span>
                    <span className="text-muted-foreground">
                      {prop.optional ? "?:" : ":"}
                    </span>
                  </div>
                  <span className={getColorByPropertyType(prop.type)}>
                    {prop.type}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No properties detected
            </p>
          )}
        </section>

        {/* Relationships */}
        <section>
          <h3 className="text-sm font-semibold text-white mb-2">
            Relationships ({entity.relationships.length})
          </h3>
          {entity.relationships.length > 0 ? (
            <div className="space-y-2">
              {entity.relationships.map((rel, i) => (
                <div key={i} className="bg-muted/30 rounded p-2 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold">
                      {rel.propertyName}
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px]",
                        rel.relationshipType === "composition"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : rel.relationshipType === "reference"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      )}
                    >
                      {rel.relationshipType}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    → {rel.toEntity} {rel.cardinality === "many" && "[*]"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No relationships
            </p>
          )}
        </section>

        {/* Methods */}
        <section>
          <h3 className="text-sm font-semibold text-white mb-2">
            Methods ({entity.methods.length})
          </h3>
          {entity.methods.length > 0 ? (
            <div className="bg-muted/30 rounded p-2 space-y-1">
              {entity.methods.map((method, i) => (
                <div key={i} className="text-xs font-mono">
                  {method.signature}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No methods detected
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
