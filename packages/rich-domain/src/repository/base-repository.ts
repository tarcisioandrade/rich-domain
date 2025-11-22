// ============================================================================
// Base Repository - Abstract implementation with common logic
// ============================================================================

import type { Aggregate } from "../entity";
import type { Criteria } from "../criteria";
import { PaginatedResult } from "../paginated-result";
import { Mapper } from "../mapper";

/**
 * Abstract base repository
 * Implements common logic, delegates persistence to subclasses
 *
 * @example
 * ```ts
 * class UserRepository extends BaseRepository<User, PrismaUser> {
 *   constructor(prisma: PrismaClient) {
 *     super(new UserMapper());
 *     this.prisma = prisma;
 *   }
 *
 *   protected async insertOne(data: PrismaUser): Promise<PrismaUser> {
 *     return this.prisma.user.create({ data });
 *   }
 *
 *   protected async updateOne(id: string, data: PrismaUser): Promise<PrismaUser> {
 *     return this.prisma.user.update({ where: { id }, data });
 *   }
 *
 *   // ... implement other abstract methods
 * }
 * ```
 */

export abstract class ReadRepository<Agg extends Aggregate<any>> {
  abstract find(criteria: Criteria<Agg>): Promise<PaginatedResult<Agg>>;
  abstract findById(id: string): Promise<Agg | null>;
  abstract count(criteria: Criteria<Agg>): Promise<number>;
  abstract exists(id: string): Promise<boolean>;
}

export abstract class WriteRepository<Agg extends Aggregate<any>> {
  abstract create(entity: Agg): Promise<void>;
  abstract update(entity: Agg): Promise<void>;
  abstract delete(entity: Agg): Promise<void>;
}

export abstract class WriteAndRead<Agg extends Aggregate<any>> {
  abstract find(criteria: Criteria<Agg>): Promise<PaginatedResult<Agg>>;
  abstract findById(id: string): Promise<Agg | null>;
  abstract create(entity: Agg): Promise<void>;
  abstract update(entity: Agg): Promise<void>;
  abstract delete(entity: Agg): Promise<void>;
  abstract count(criteria: Criteria<Agg>): Promise<number>;
  abstract exists(id: string): Promise<boolean>;
}

export abstract class Repository<
  TDomain extends Aggregate<any>
> extends WriteAndRead<TDomain> {
  protected abstract readonly mapperToDomain: Mapper<unknown, TDomain>;
  protected abstract readonly mapperToPersistence: Mapper<TDomain, unknown>;
  abstract get model(): any;
}
