"use client";

import { FileQuestion } from "lucide-react";

interface DataViewEmptyProps {
  message?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function DataViewEmpty({
  message = "No results found.",
  icon,
  className = "",
}: DataViewEmptyProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
    >
      <div className="mb-4 text-muted-foreground">
        {icon || <FileQuestion className="h-12 w-12" />}
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
