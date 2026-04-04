import { Mapper } from "@woltz/rich-domain";

/**
 * Base class for mapping Drizzle query results to domain entities.
 * Subclass and implement build() to transform DB records to domain aggregates.
 *
 * This is identical to a plain Mapper<TPersistence, TDomain>.
 * Provided for naming consistency with the adapter pattern.
 */
export abstract class DrizzleToDomain<TPersistence, TDomain> extends Mapper<
  TPersistence,
  TDomain
> {}
