import type { Repository, Aggregate } from "@woltz/rich-domain";
import { Criteria } from "@woltz/rich-domain";

/**
 * Convert entities to plain objects using toJSON
 *
 * Converts an array of domain entities/aggregates to plain JavaScript objects
 * by calling their toJSON() method. This is the standard serialization method
 * used by rich-domain entities.
 *
 * @param entities - Array of entities to convert
 * @returns Array of plain objects
 *
 * @example
 * ```typescript
 * const users = await repository.find(criteria);
 * const records = entitiesToRecords(users.data);
 * // records is now plain objects ready for export
 * ```
 */
export function entitiesToRecords<T>(entities: T[]): any[] {
  return entities.map((entity) => {
    // Check if entity has toJSON method (standard for Aggregates)
    if (typeof (entity as any).toJSON === "function") {
      return (entity as any).toJSON();
    }

    // Fallback: return entity as-is (assume it's already a plain object)
    return entity;
  });
}

/**
 * Create an async iterator for batched record retrieval
 *
 * Creates an async generator that fetches entities from the repository
 * in batches and yields them as arrays of plain objects. This enables
 * memory-efficient streaming exports for large datasets.
 *
 * @param repository - Repository to fetch from
 * @param criteria - Filter and sort criteria
 * @param batchSize - Number of records per batch
 * @yields Batches of plain objects
 *
 * @example
 * ```typescript
 * const iterator = createRecordIterator(userRepository, criteria, 1000);
 *
 * for await (const batch of iterator) {
 *   console.log(`Processing batch of ${batch.length} records`);
 *   // Process batch...
 * }
 * ```
 */
export async function* createRecordIterator<T extends Aggregate<any>>(
  repository: Repository<T>,
  criteria: Criteria<T> | undefined,
  batchSize: number
): AsyncIterable<any[]> {
  let currentPage = 1;

  while (true) {
    // Create criteria with pagination for current batch
    const batchCriteria =
      criteria?.clone().paginate(currentPage, batchSize) ??
      Criteria.create<T>().paginate(currentPage, batchSize);

    // Fetch batch from repository
    const result = await repository.find(batchCriteria);

    // Stop if no more entities
    if (result.data.length === 0) {
      break;
    }

    // Yield batch as plain objects
    yield entitiesToRecords(result.data);

    // Stop if this was the last page
    if (!result.meta.hasNext) {
      break;
    }

    // Move to next page
    currentPage++;
  }
}
