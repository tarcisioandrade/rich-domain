import { TypeORMUnitOfWork } from "../unit-of-work";

/**
 * Decorator to wrap a method in a TypeORM transaction.
 *
 * If already in a transaction, reuses the existing context.
 * Otherwise, creates a new transaction.
 *
 * @param uowFromUser - Optional TypeORMUnitOfWork instance to use for the transaction
 *
 * @example
 * ```typescript
 * class UserService {
 *   constructor(
 *     private readonly uow: TypeORMUnitOfWork,
 *     private readonly userRepo: UserRepository,
 *     private readonly orderRepo: OrderRepository
 *   ) {}
 *
 *   @Transactional()
 *   async createUserWithOrders(
 *     userData: CreateUserData,
 *     orders: CreateOrderData[]
 *   ): Promise<User> {
 *     const user = User.create(userData);
 *     await this.userRepo.save(user);
 *
 *     for (const orderData of orders) {
 *       const order = Order.create({ ...orderData, userId: user.id });
 *       await this.orderRepo.save(order);
 *     }
 *
 *     return user;
 *     // Commits automatically on success, rolls back on error
 *   }
 * }
 * ```
 */
export function Transactional(uowFromUser?: TypeORMUnitOfWork) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const uow: TypeORMUnitOfWork = uowFromUser ?? this["uow"];

      if (!uow) {
        throw new Error(
          `@Transactional decorator requires a TypeORMUnitOfWork instance. ` +
            `Make sure your class has a 'uow' property or pass it as a parameter to the decorator.`
        );
      }

      if (!(uow instanceof TypeORMUnitOfWork)) {
        throw new Error(
          `Property 'uow' must be an instance of TypeORMUnitOfWork`
        );
      }

      return await uow.transaction(async () => {
        return await originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}
