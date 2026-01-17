import { generateKeyBetween } from "fractional-indexing";

/**
 * Backend service for validating and recalculating fractional indexes
 * 
 * In a real backend, this would be server-side code that:
 * - Validates fractional indexes received from clients
 * - Recalculates indexes if invalid or conflicting
 * - Ensures consistency across all clients
 * - Prevents race conditions
 */

/**
 * Validates if a string is a valid fractional index
 */
export function isValidFractionalIndex(index: string): boolean {
  if (!index || typeof index !== "string" || index.trim() === "") {
    return false;
  }

  try {
    // Try to generate a key after this one - if it works, the index is valid
    generateKeyBetween(index, null);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a fractional index is in the correct position relative to other items
 * 
 * @param newOrder - The proposed new order
 * @param items - All items in the same group (e.g., same status)
 * @param excludeId - ID of the item being moved (to exclude from validation)
 * @returns True if the order is valid, false otherwise
 */
export function isOrderValid<T extends { id: string; order: string }>(
  newOrder: string,
  items: T[],
  excludeId?: string
): boolean {
  if (!isValidFractionalIndex(newOrder)) {
    return false;
  }

  // Filter out the item being moved
  const otherItems = excludeId
    ? items.filter((item) => item.id !== excludeId)
    : items;

  // Check if newOrder conflicts with existing orders
  // In a properly ordered list, newOrder should be between prev and next
  const sortedItems = [...otherItems].sort((a, b) => {
    const aOrder = a.order || "";
    const bOrder = b.order || "";
    if (aOrder < bOrder) return -1;
    if (aOrder > bOrder) return 1;
    return 0;
  });

  // Check for duplicates
  const hasDuplicate = sortedItems.some((item) => item.order === newOrder);
  if (hasDuplicate) {
    return false;
  }

  return true;
}

/**
 * Recalculates a fractional index using ONLY prevOrder and nextOrder
 * 
 * This is the CORRECT way to use fractional indexing on the backend!
 * You only need the 2 adjacent items, not all items.
 * 
 * @param prevOrder - Order of item before target position (null if first)
 * @param nextOrder - Order of item after target position (null if last)
 * @returns A valid fractional index between prevOrder and nextOrder
 */
export function recalculateOrderFromAdjacent(
  prevOrder: string | null,
  nextOrder: string | null
): string {
  return generateKeyBetween(prevOrder ?? null, nextOrder ?? null);
}

/**
 * Recalculates a fractional index for a given position
 * 
 * NOTE: This function requires all items, which defeats the purpose of fractional indexing.
 * Use recalculateOrderFromAdjacent() instead when you have prevOrder and nextOrder.
 * 
 * @deprecated Use recalculateOrderFromAdjacent() instead - it only needs 2 values, not all items
 * @param items - All items in the same group
 * @param targetIndex - The target position (0 = first, items.length = last)
 * @param excludeId - ID of the item being moved (to exclude from calculation)
 * @returns A valid fractional index for the target position
 */
export function recalculateOrder<T extends { id: string; order: string }>(
  items: T[],
  targetIndex: number,
  excludeId?: string
): string {
  // Filter out the item being moved
  const otherItems = excludeId
    ? items.filter((item) => item.id !== excludeId)
    : items;

  // Sort items by order
  const sortedItems = [...otherItems].sort((a, b) => {
    const aOrder = a.order && a.order.trim() !== "" ? a.order : "zzzzzz";
    const bOrder = b.order && b.order.trim() !== "" ? b.order : "zzzzzz";
    if (aOrder < bOrder) return -1;
    if (aOrder > bOrder) return 1;
    return 0;
  });

  // Filter out items with empty order
  const validItems = sortedItems.filter(
    (item) => item.order && item.order.trim() !== ""
  );

  if (validItems.length === 0) {
    // First item
    return generateKeyBetween(null, null);
  }

  // Handle insertion at the beginning
  if (targetIndex <= 0) {
    const firstOrder = validItems[0]?.order;
    if (!firstOrder) {
      return generateKeyBetween(null, null);
    }
    return generateKeyBetween(null, firstOrder);
  }

  // Handle insertion at or beyond the end
  if (targetIndex >= sortedItems.length) {
    const lastOrder = validItems[validItems.length - 1]?.order;
    if (!lastOrder) {
      return generateKeyBetween(null, null);
    }
    return generateKeyBetween(lastOrder, null);
  }

  // Find the position in validItems based on targetIndex
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
      return generateKeyBetween(null, null);
    }
    return generateKeyBetween(lastOrder, null);
  }

  // Insert between two valid items
  const prevOrder = validCount > 0 ? validItems[validCount - 1]?.order : null;
  let nextOrder = validItems[validCount]?.order;

  // Handle case where multiple items have the same order
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
      return generateKeyBetween(prevOrder, null);
    }
  }

  // Safety check: ensure prevOrder < nextOrder
  if (prevOrder && nextOrder && prevOrder >= nextOrder) {
    // If orders are equal or invalid, generate a new index after prevOrder
    return generateKeyBetween(prevOrder, null);
  }

  return generateKeyBetween(prevOrder ?? null, nextOrder ?? null);
}

/**
 * Validates and recalculates order if necessary
 * This is the main function that should be called on the backend
 * 
 * @param proposedOrder - The order proposed by the client (suggestion)
 * @param items - All items in the same group
 * @param targetIndex - The target position
 * @param excludeId - ID of the item being moved
 * @returns The validated/corrected order
 */
export function validateAndRecalculateOrder<T extends { id: string; order: string }>(
  proposedOrder: string,
  items: T[],
  targetIndex: number,
  excludeId?: string
): string {
  // Always recalculate on backend to ensure consistency
  // The proposedOrder from client is just a hint for performance
  // Backend is the source of truth
  const recalculatedOrder = recalculateOrder(items, targetIndex, excludeId);

  // Optionally validate that proposedOrder is close to recalculatedOrder
  // This can help detect client-side bugs or race conditions
  if (proposedOrder !== recalculatedOrder) {
    // Log warning in development, but use recalculated value
    if (import.meta.env.DEV) {
      console.warn(
        `Order mismatch: proposed=${proposedOrder}, recalculated=${recalculatedOrder}. Using recalculated value.`
      );
    }
  }

  return recalculatedOrder;
}
