import { generateKeyBetween } from "fractional-indexing";

/**
 * Generates a fractional index between two other indices.
 * If both prev and next are null/undefined, generates the first index.
 *
 * @param prev - Previous index (or null/undefined for first position)
 * @param next - Next index (or null/undefined for last position)
 * @returns A new fractional index string
 */
export function generateFractionalIndex(
  prev: string | null | undefined,
  next: string | null | undefined
): string {
  try {
    if (prev && next && prev >= next) {
      return generateKeyBetween(prev, null);
    }
    return generateKeyBetween(prev ?? null, next ?? null);
  } catch {
    if (!prev && !next) {
      return "a0";
    }
    if (!prev) {
      try {
        return generateKeyBetween(null, next);
      } catch {
        return "a0";
      }
    }
    if (!next) {
      try {
        return generateKeyBetween(prev, null);
      } catch {
        return generateKeyBetween(prev, null);
      }
    }
    return generateKeyBetween(prev, null);
  }
}

/**
 * Validates if a string is a valid fractional index
 * Fractional indexes are valid if they can be used with generateKeyBetween
 *
 * @param index - The index string to validate
 * @returns True if valid, false otherwise
 */
export function isValidFractionalIndex(index: string): boolean {
  try {
    // Try to generate a key after this one - if it works, the index is valid
    generateKeyBetween(index, null);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a fractional index for inserting an item at a specific position
 * in an ordered list of items.
 *
 * @param items - Array of items with order property (should be sorted by order)
 * @param targetIndex - The index position where the item should be inserted (visual index)
 * @returns A new fractional index string
 */
export function generateIndexAtPosition<T extends { order: string }>(
  items: T[],
  targetIndex: number
): string {
  const sortedItems = [...items].sort((a, b) => {
    const aOrder = a.order && a.order.trim() !== "" ? a.order : "zzzzzz";
    const bOrder = b.order && b.order.trim() !== "" ? b.order : "zzzzzz";
    if (aOrder < bOrder) return -1;
    if (aOrder > bOrder) return 1;
    return 0;
  });

  const validItems = sortedItems.filter(
    (item) => item.order && item.order.trim() !== ""
  );

  if (validItems.length === 0) {
    return generateFractionalIndex(null, null);
  }

  if (targetIndex <= 0) {
    const firstOrder = validItems[0]?.order;
    if (!firstOrder) {
      return generateFractionalIndex(null, null);
    }
    const newIndex = generateFractionalIndex(null, firstOrder);
    if (newIndex >= firstOrder) {
      return generateKeyBetween(null, firstOrder);
    }
    return newIndex;
  }

  if (targetIndex >= sortedItems.length) {
    const lastOrder = validItems[validItems.length - 1]?.order;
    if (!lastOrder) {
      return generateFractionalIndex(null, null);
    }
    return generateFractionalIndex(lastOrder, null);
  }

  let validCount = 0;
  for (let i = 0; i < targetIndex && i < sortedItems.length; i++) {
    if (sortedItems[i].order && sortedItems[i].order.trim() !== "") {
      validCount++;
    }
  }

  if (validCount >= validItems.length) {
    const lastOrder = validItems[validItems.length - 1]?.order;
    if (!lastOrder) {
      return generateFractionalIndex(null, null);
    }
    return generateFractionalIndex(lastOrder, null);
  }

  const prevOrder = validCount > 0 ? validItems[validCount - 1]?.order : null;
  let nextOrder = validItems[validCount]?.order;

  if (prevOrder && nextOrder && prevOrder === nextOrder) {
    for (let i = validCount; i < validItems.length; i++) {
      const candidateOrder = validItems[i]?.order;
      if (candidateOrder && candidateOrder !== prevOrder) {
        nextOrder = candidateOrder;
        break;
      }
    }
    if (nextOrder === prevOrder) {
      return generateFractionalIndex(prevOrder, null);
    }
  }

  if (prevOrder && nextOrder && prevOrder >= nextOrder) {
    return generateFractionalIndex(prevOrder, null);
  }

  return generateFractionalIndex(prevOrder, nextOrder);
}

/**
 * Generates a fractional index for moving an item from one position to another
 * within the same list or between lists.
 *
 * @param items - Array of items with order property (excluding the item being moved, should be sorted by order)
 * @param targetIndex - The index position where the item should be inserted
 * @returns A new fractional index string
 */
export function generateIndexForMove<T extends { order: string }>(
  items: T[],
  targetIndex: number
): string {
  return generateIndexAtPosition(items, targetIndex);
}
