// ============================================================================
// Mapper - Domain ↔ Persistence
// ============================================================================

import type { Aggregate } from "../entity";

/**
 * Mapper interface for converting between Domain and Persistence models
 *
 * @template TDomain - Domain aggregate/entity
 * @template TPersistence - Database model (Prisma, TypeORM, etc.)
 *
 * @example
 * ```ts
 * class UserMapper implements IMapper<User, PrismaUser> {
 *   toDomain(persistence: PrismaUser): User {
 *     return new User({
 *       id: Id.from(persistence.id),
 *       name: persistence.name,
 *       email: persistence.email,
 *     });
 *   }
 *
 *   toPersistence(domain: User): PrismaUser {
 *     return {
 *       id: domain.id.value,
 *       name: domain.props.name,
 *       email: domain.props.email,
 *     };
 *   }
 * }
 * ```
 */
export interface IMapper<TDomain extends Aggregate<any>, TPersistence = any> {
  /**
   * Convert from persistence model to domain aggregate
   */
  toDomain(persistence: TPersistence): TDomain;

  /**
   * Convert from domain aggregate to persistence model
   */
  toPersistence(domain: TDomain): TPersistence;

  /**
   * Convert array of persistence models to domain aggregates
   */
  toDomainList?(persistence: TPersistence[]): TDomain[];

  /**
   * Convert array of domain aggregates to persistence models
   */
  toPersistenceList?(domain: TDomain[]): TPersistence[];
}

/**
 * Base mapper with default array implementations
 */
export abstract class BaseMapper<
  TDomain extends Aggregate<any>,
  TPersistence = any
> implements IMapper<TDomain, TPersistence>
{
  abstract toDomain(persistence: TPersistence): TDomain;
  abstract toPersistence(domain: TDomain): TPersistence;

  toDomainList(persistence: TPersistence[]): TDomain[] {
    return persistence.map((p) => this.toDomain(p));
  }

  toPersistenceList(domain: TDomain[]): TPersistence[] {
    return domain.map((d) => this.toPersistence(d));
  }
}
