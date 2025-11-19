// ============================================================================
// Repository Module - Clean exports
// ============================================================================

// Mapper
export { BaseMapper } from "./mapper";
export type { IMapper } from "./mapper";

// Base implementations
export { BaseRepository } from "./base-repository";
export { InMemoryRepository } from "./in-memory-repository";

// Unit of Work
export {
  UnitOfWork,
  BaseTransactionContext,
  InMemoryUnitOfWork,
} from "./unit-of-work";

/**
 * QUICK START:
 *
 * 1. For Testing:
 * ```ts
 * import { InMemoryRepository } from 'rich-domain';
 *
 * const userRepo = new InMemoryRepository<User>();
 * await userRepo.save(user);
 * const found = await userRepo.findById(user.id);
 * ```
 *
 * 2. For Production (Prisma, TypeORM, etc):
 * - Extend BaseRepository
 * - Implement abstract methods
 * - Create a Mapper
 * - See examples/ folder for reference
 *
 * 3. With Criteria:
 * ```ts
 * const result = await userRepo.find(
 *   Criteria.create<User>()
 *     .whereEquals('status', 'active')
 *     .orderByDesc('createdAt')
 *     .paginate(1, 10)
 * );
 * ```
 *
 * 4. With Unit of Work:
 * ```ts
 * await uow.transaction(async (ctx) => {
 *   const userRepo = uow.getRepository(UserRepository);
 *   await userRepo.save(user);
 * });
 * ```
 */
