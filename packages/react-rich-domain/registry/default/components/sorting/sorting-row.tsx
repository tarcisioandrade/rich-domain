"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, ArrowUp, ArrowDown } from "lucide-react";
import type { Order, OrderDirection } from "@woltz/rich-domain";
import type { SortingField } from "./sorting";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../../lib/utils";

interface SortingRowProps {
  id: number;
  sort: Order;
  fields: SortingField[];
  onUpdate: (field: string, direction: OrderDirection) => void;
  onRemove: () => void;
}

export function SortingRow({
  id,
  sort,
  fields,
  onUpdate,
  onRemove,
}: SortingRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const currentField = fields.find((f) => f.field === sort.field);
  const fieldLabel = currentField?.fieldLabel || sort.field;

  const toggleDirection = () => {
    const newDirection: OrderDirection =
      sort.direction === "asc" ? "desc" : "asc";
    onUpdate(sort.field, newDirection);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border bg-card",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Select
        value={sort.field}
        onValueChange={(value) => onUpdate(value, sort.direction)}
      >
        <SelectTrigger size="sm" className="h-8 flex-1">
          <SelectValue>{fieldLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {fields.map((field) => (
            <SelectItem key={field.field} value={field.field}>
              {field.fieldLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        className="h-8 w-[70px] gap-1.5"
        onClick={toggleDirection}
      >
        {sort.direction === "asc" ? (
          <>
            <ArrowUp className="h-3.5 w-3.5" />
            <span className="text-xs">Asc</span>
          </>
        ) : (
          <>
            <ArrowDown className="h-3.5 w-3.5" />
            <span className="text-xs">Desc</span>
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
