"use client";

import { cn } from "@/lib/utils";

interface DataTimelineItemProps {
  /**
   * The content to render inside the timeline item
   */
  children: React.ReactNode;

  /**
   * Whether this is the last item in the group
   */
  isLast?: boolean;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Custom icon/dot for the timeline marker
   */
  icon?: React.ReactNode;
}

export function DataTimelineItem({
  children,
  isLast = false,
  className,
  icon,
}: DataTimelineItemProps) {
  return (
    <div className={cn("relative pb-6 last:pb-0", className)}>
      {!isLast && (
        <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-border" />
      )}

      <div className="absolute left-0 top-1.5">
        {icon ? (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
            {icon}
          </div>
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-background bg-primary" />
        )}
      </div>

      <div className="ml-8">{children}</div>
    </div>
  );
}
