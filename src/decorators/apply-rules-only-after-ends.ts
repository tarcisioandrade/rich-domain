import { Entity } from '../core/domain/entity';

/**
 * @description This decorator will ensure that the business rules will be applied only after the commit.
 * This will help in case your method has a lot of commits, and you want to apply the rules only after the last commit.
 * that means, if you update your entity X times in a method, the rules will be applied only after the method ends.
 */
export function ApplyRulesOnlyAfterCommitsSync() {
  return (_: Entity<any>, __: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const rulesIsLocked = 'rulesIsLocked' as keyof typeof this;
      const ensureBusinessRules = 'ensureBusinessRules' as keyof typeof this;

      this[rulesIsLocked] = true;
      const result = originalMethod.apply(this, args);
      this[rulesIsLocked] = false;
      this[ensureBusinessRules]();
      return result;
    };
  };
}
