"use client";

import { cn } from "@/lib/utils";
import type { TimelineGroup } from "@/types/use-criteria-timeline.type";
import { Badge } from "@/components/ui/badge";

interface DataTimelineGroupProps<T> {
  /**
   * The timeline group data
   */
  group: TimelineGroup<T>;

  /**
   * Render function for each item in the group
   */
  renderItem: (item: T, index: number, isLast: boolean) => React.ReactNode;

  /**
   * Custom className for the group container
   */
  className?: string;

  /**
   * Whether to show the relative label (e.g., "Today", "2 hours ago")
   * @default true
   */
  showRelativeLabel?: boolean;
}

export function DataTimelineGroup<T>({
  group,
  renderItem,
  className,
  showRelativeLabel = true,
}: DataTimelineGroupProps<T>) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Group header */}
      <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 py-2">
        <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
        {showRelativeLabel && group.relativeLabel && (
          <Badge variant="secondary" className="text-xs">
            {group.relativeLabel}
          </Badge>
        )}
        <div className="flex-1 border-b" />
        <span className="text-xs text-muted-foreground">
          {group.items.length} {group.items.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Timeline items */}
      <div className="space-y-0">
        {group.items.map((item, index) =>
          renderItem(item, index, index === group.items.length - 1)
        )}
      </div>
    </div>
  );
}
