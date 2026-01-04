"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Order, OrderDirection } from "@woltz/rich-domain";
import type { SortingField } from "./sorting";
import { SortingRow } from "./sorting-row";

interface SortingListProps {
  sorting: Order[];
  fields: SortingField[];
  onUpdate: (index: number, field: string, direction: OrderDirection) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function SortingList({
  sorting,
  fields,
  onUpdate,
  onRemove,
  onReorder,
}: SortingListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = Number(active.id);
      const newIndex = Number(over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  const getAvailableFieldsForRow = (currentField: string) => {
    const usedFields = sorting.map((sort) => sort.field);
    return fields.filter(
      (field) =>
        field.field === currentField || !usedFields.includes(field.field)
    );
  };

  const items = useMemo(() => sorting.map((_, i) => i), [sorting]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sorting.map((sort, index) => (
            <SortingRow
              key={`${sort.field}-${index}`}
              id={index}
              sort={sort}
              fields={getAvailableFieldsForRow(sort.field)}
              onUpdate={(field, direction) => onUpdate(index, field, direction)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
