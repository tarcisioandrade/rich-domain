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
