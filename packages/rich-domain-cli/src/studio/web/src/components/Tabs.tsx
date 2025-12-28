import { cn } from "@/lib/utils";
import { EntityType, TabState } from "../interfaces";
import { Box, Layers, Gem, X } from "lucide-react";
import { Button } from "./ui/button";

interface TabsProps {
  tabs: TabState[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

const entityTypeConfig: Record<EntityType, { icon: any; color: string }> = {
  aggregate: { icon: Box, color: "text-primary" },
  entity: { icon: Layers, color: "text-blue-400" },
  "value-object": { icon: Gem, color: "text-emerald-400" },
};

export default function Tabs({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewTab,
}: TabsProps) {
  return (
    <div className="flex h-10 items-center gap-0 border-b border-border bg-muted/30 overflow-x-auto">
      {/* Tab List */}
      {tabs.map((tab) => {
        const config = entityTypeConfig.aggregate;
        const Icon = config.icon;
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className={cn(
              "group relative flex h-9 min-w-[120px] max-w-[200px] cursor-pointer items-center gap-2 border-r border-border px-3 transition-colors",
              isActive
                ? "bg-background border-b-2 border-b-primary"
                : "hover:bg-muted/50"
            )}
            onClick={() => onTabClick(tab.id)}
          >
            <Icon className={cn("size-3.5 shrink-0", config.color)} />
            <span
              className={cn(
                "truncate text-sm font-mono",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab.label}
            </span>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "ml-auto size-5 shrink-0 rounded-sm opacity-0 transition-opacity hover:bg-muted",
                "group-hover:opacity-100",
                isActive && "opacity-60"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              <X className="size-3" />
            </Button>

            {/* Active indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </div>
        );
      })}

      <div className="flex-1" />
    </div>
  );
}
