"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface DataTimelineSkeletonProps {
  /**
   * Number of skeleton items to render
   * @default 3
   */
  count?: number;
}

export function DataTimelineSkeleton({ count = 3 }: DataTimelineSkeletonProps) {
  return (
    <div className="space-y-8">
      {Array.from({ length: count }).map((_, groupIndex) => (
        <div key={groupIndex} className="space-y-4">
          {/* Group header */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Timeline items */}
          <div className="space-y-4 pl-4 border-l-2 border-muted ml-2">
            {Array.from({ length: 2 }).map((_, itemIndex) => (
              <div key={itemIndex} className="relative pl-6">
                {/* Timeline dot */}
                <Skeleton className="absolute left-[-9px] top-2 h-4 w-4 rounded-full" />

                {/* Content */}
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 mt-3">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
