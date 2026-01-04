import { useCallback } from "react";
import type { FieldPath, OrderDirection } from "@woltz/rich-domain";
import type { UseCriteriaReturn } from "../types/use-criteria.type";

export interface UseSortingAdapterReturn {
  updateSort: (index: number, field: string, direction: OrderDirection) => void;
  reorderSort: (fromIndex: number, toIndex: number) => void;
}

export function useSortingAdapter<T>(
  criteria: UseCriteriaReturn<T>
): UseSortingAdapterReturn {
  const updateSort = useCallback(
    (index: number, field: string, direction: OrderDirection) => {
      const currentSorting = [...criteria.sorting];
      const sortToUpdate = currentSorting[index];

      if (!sortToUpdate) return;

      currentSorting[index] = { field, direction };

      criteria.clearSort();
      currentSorting.forEach((sort) => {
        criteria.addSort(sort.field as FieldPath<T>, sort.direction);
      });
    },
    [criteria]
  );

  const reorderSort = useCallback(
    (fromIndex: number, toIndex: number) => {
      const currentSorting = [...criteria.sorting];
      const [movedItem] = currentSorting.splice(fromIndex, 1);

      if (!movedItem) return;

      currentSorting.splice(toIndex, 0, movedItem);

      criteria.clearSort();
      currentSorting.forEach((sort) => {
        criteria.addSort(sort.field as FieldPath<T>, sort.direction);
      });
    },
    [criteria]
  );

  return {
    updateSort,
    reorderSort,
  };
}
