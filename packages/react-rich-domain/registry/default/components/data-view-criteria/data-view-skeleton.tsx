"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface DataViewSkeletonProps {
  count?: number;
  variant?: "card" | "list" | "timeline" | "kanban";
  className?: string;
}

export function DataViewSkeleton({
  count = 3,
  variant = "card",
  className = "",
}: DataViewSkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index} variant={variant} />
      ))}
    </div>
  );
}

function SkeletonItem({ variant }: { variant: DataViewSkeletonProps["variant"] }) {
  switch (variant) {
    case "card":
      return (
        <div className="rounded-lg border p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      );

    case "list":
      return (
        <div className="flex items-center gap-3 p-3 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      );

    case "timeline":
      return (
        <div className="flex gap-4 pb-6">
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-full w-px flex-1 mt-2" />
          </div>
          <div className="flex-1 space-y-2 pb-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      );

    case "kanban":
      return (
        <div className="rounded-lg border p-3 space-y-2 mb-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      );

    default:
      return null;
  }
}
