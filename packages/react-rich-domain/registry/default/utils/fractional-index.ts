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
    // Validate that prev < next if both are provided
    if (prev && next && prev >= next) {
      // If prev >= next, this is invalid - try to generate after prev instead
      console.warn(
        `Invalid fractional index range: prev=${prev}, next=${next}. Generating after prev.`
      );
      return generateKeyBetween(prev, null);
    }
    return generateKeyBetween(prev ?? null, next ?? null);
  } catch (error) {
    // Fallback: if generation fails, create a simple index
    if (!prev && !next) {
      return "a0";
    }
    if (!prev) {
      // Insert before next
      try {
        return generateKeyBetween(null, next);
      } catch {
        // If next is invalid, generate a new index
        return "a0";
      }
    }
    if (!next) {
      // Insert after prev
      try {
        return generateKeyBetween(prev, null);
      } catch {
        // If prev is invalid, generate a new index after it
        return generateKeyBetween(prev, null);
      }
    }
    // If both are provided but invalid, try generating after prev
    console.error(
      `Failed to generate fractional index between ${prev} and ${next}:`,
      error
    );
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
  // Sort all items by order (items with empty order will be sorted to the end)
  const sortedItems = [...items].sort((a, b) => {
    const aOrder = a.order && a.order.trim() !== "" ? a.order : "zzzzzz";
    const bOrder = b.order && b.order.trim() !== "" ? b.order : "zzzzzz";
    // Sort lexicographically (fractional indexes are designed for this)
    if (aOrder < bOrder) return -1;
    if (aOrder > bOrder) return 1;
    return 0;
  });

  // Filter out items with empty order for fractional index calculation
  const validItems = sortedItems.filter(
    (item) => item.order && item.order.trim() !== ""
  );

  if (validItems.length === 0) {
    // First item
    return generateFractionalIndex(null, null);
  }

  // Handle insertion at the beginning
  if (targetIndex <= 0) {
    const firstOrder = validItems[0]?.order;
    if (!firstOrder) {
      return generateFractionalIndex(null, null);
    }
    // Generate an index before the first item
    const newIndex = generateFractionalIndex(null, firstOrder);
    // Safety check: ensure the new index is actually less than firstOrder
    if (newIndex >= firstOrder) {
      // If generation failed (e.g., firstOrder is invalid), try a different approach
      // Generate a key that's definitely before firstOrder by using a smaller base
      return generateKeyBetween(null, firstOrder);
    }
    return newIndex;
  }

  // Handle insertion at or beyond the end
  if (targetIndex >= sortedItems.length) {
    // Insert at the end
    const lastOrder = validItems[validItems.length - 1]?.order;
    if (!lastOrder) {
      return generateFractionalIndex(null, null);
    }
    return generateFractionalIndex(lastOrder, null);
  }

  // Find the position in validItems based on targetIndex
  // Count how many valid items are before targetIndex
  let validCount = 0;
  for (let i = 0; i < targetIndex && i < sortedItems.length; i++) {
    if (sortedItems[i].order && sortedItems[i].order.trim() !== "") {
      validCount++;
    }
  }

  // If we've counted all valid items, insert at the end
  if (validCount >= validItems.length) {
    const lastOrder = validItems[validItems.length - 1]?.order;
    if (!lastOrder) {
      return generateFractionalIndex(null, null);
    }
    return generateFractionalIndex(lastOrder, null);
  }

  // Insert between two valid items
  // When targetIndex points to a position, we want to insert AFTER the validCount-th item
  // So prevOrder is the validCount-th item, and nextOrder is the (validCount+1)-th item
  const prevOrder = validCount > 0 ? validItems[validCount - 1]?.order : null;
  let nextOrder = validItems[validCount]?.order;

  // Handle case where multiple items have the same order
  // If prevOrder === nextOrder, we need to find a different nextOrder
  if (prevOrder && nextOrder && prevOrder === nextOrder) {
    // Find the next item with a different order
    for (let i = validCount; i < validItems.length; i++) {
      const candidateOrder = validItems[i]?.order;
      if (candidateOrder && candidateOrder !== prevOrder) {
        nextOrder = candidateOrder;
        break;
      }
    }
    // If all remaining items have the same order, insert after prevOrder
    if (nextOrder === prevOrder) {
      return generateFractionalIndex(prevOrder, null);
    }
  }

  // Safety check: ensure prevOrder < nextOrder
  if (prevOrder && nextOrder && prevOrder >= nextOrder) {
    // If orders are equal or invalid, generate a new index after prevOrder
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
