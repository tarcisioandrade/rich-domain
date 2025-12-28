import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface ContextSidebarProps {
  contexts: string[];
  selectedContext: string | null;
  onContextSelect: (context: string) => void;
}

export default function ContextSidebar({
  contexts,
  selectedContext,
  onContextSelect,
}: ContextSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    // Collapsed state - just a toggle button
    return (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-card border border-border rounded-r-lg p-2 hover:bg-muted transition-colors"
          title="Show contexts"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-4 top-4 bottom-4 w-64 bg-card border border-border rounded-lg shadow-lg z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Bounded Contexts</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-muted rounded transition-colors"
          title="Hide sidebar"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      {/* Context List */}
      <div className="flex-1 overflow-y-auto p-2">
        {contexts.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No contexts detected
          </div>
        ) : (
          <div className="space-y-1">
            {contexts.map((context) => (
              <button
                key={context}
                onClick={() => onContextSelect(context)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                  selectedContext === context
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <div className="font-medium font-mono">{context}</div>
                <div className="text-xs opacity-70 mt-0.5">
                  src/{context}/domain/
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        Select a context to filter the diagram
      </div>
    </div>
  );
}
