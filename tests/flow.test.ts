// Test that simulates exactly what BaseEntity does
import { z } from 'zod';
import {
  Id,
  Aggregate,
  ValidationError,
  EntityValidation,
  EntityHooks,
  BaseProps,
  throwValidationError,
} from '../src';

interface UserProps extends BaseProps {
  id: Id;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive';
}

const userSchema = z.object({
  id: z.custom<Id>(val => val instanceof Id, { message: 'Invalid Id' }),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  age: z
    .number()
    .min(0)
    .max(150),
  status: z.enum(['active', 'inactive']),
});

describe('BaseEntity Flow Simulation', () => {
  it('should test User class static properties access', () => {
    class TestUser extends Aggregate<UserProps> {
      protected static validation: EntityValidation<UserProps> = {
        schema: userSchema,
        config: {
          onCreate: true,
          onUpdate: true,
          throwOnError: true,
        },
      };

      protected static hooks: EntityHooks<UserProps, TestUser> = {
        defaultValues: {
          age: 18,
          status: 'active',
        },
      };

      get name(): string {
        return this.properties.name;
      }
    }

    // Test that static properties are accessible
    console.log('TestUser.validation:', (TestUser as any).validation);
    console.log('TestUser.hooks:', (TestUser as any).hooks);

    expect((TestUser as any).validation).toBeDefined();
    expect((TestUser as any).hooks).toBeDefined();
  });

  it('should create user with valid data - step by step', () => {
    class TestUser extends Aggregate<UserProps> {
      protected static validation: EntityValidation<UserProps> = {
        schema: userSchema,
        config: {
          onCreate: true,
          onUpdate: true,
          throwOnError: true,
        },
      };

      protected static hooks: EntityHooks<UserProps, TestUser> = {
        defaultValues: {
          age: 18,
          status: 'active',
        },
      };

      get name(): string {
        return this.properties.name;
      }
    }

    console.log('Attempting to create TestUser with valid data...');

    try {
      const user = new TestUser({
        name: 'John Doe',
        email: 'john@example.com',
      });

      console.log('User created successfully:', user);
      console.log('User name:', user.name);
      expect(user.name).toBe('John Doe');
    } catch (error) {
      console.error('Error creating user:', error);
      console.error('Error name:', (error as Error).name);
      console.error('Error message:', (error as Error).message);
      console.error('Error stack:', (error as Error).stack);
      throw error;
    }
  });

  it('should throw ValidationError for invalid data', () => {
    class TestUser extends Aggregate<UserProps> {
      protected static validation: EntityValidation<UserProps> = {
        schema: userSchema,
        config: {
          onCreate: true,
          onUpdate: true,
          throwOnError: true,
        },
      };

      protected static hooks: EntityHooks<UserProps, TestUser> = {
        defaultValues: {
          age: 18,
          status: 'active',
        },
      };

      get name(): string {
        return this.properties.name;
      }
    }

    console.log('Attempting to create TestUser with INVALID data...');

    let caughtError: Error | null = null;

    try {
      const user = new TestUser({
        name: 'J', // Too short
        email: 'invalid-email',
      });
      console.log('User was created (should not happen):', user);
    } catch (error) {
      caughtError = error as Error;
      console.log('Caught error type:', caughtError.constructor.name);
      console.log('Error name:', caughtError.name);
      console.log('Error message:', caughtError.message);
      console.log(
        'Is ValidationError:',
        caughtError instanceof ValidationError
      );

      if (caughtError instanceof ValidationError) {
        console.log('ValidationError issues:', caughtError.issues);
      }

      console.log('Stack trace:', caughtError.stack);
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError).toBeInstanceOf(ValidationError);
  });

  it('should test rules hook execution', () => {
    class TestUser extends Aggregate<UserProps> {
      protected static validation: EntityValidation<UserProps> = {
        schema: userSchema,
        config: {
          onCreate: true,
          onUpdate: true,
          throwOnError: true,
        },
      };

      protected static hooks: EntityHooks<UserProps, TestUser> = {
        defaultValues: {
          age: 18,
          status: 'active',
        },
        rules: entity => {
          console.log('Rules hook called with entity:', entity);
          if (entity.name.toLowerCase() === 'admin') {
            console.log('Throwing ValidationError for admin name');
            throwValidationError('name', 'Name cannot be "admin"');
          }
        },
      };

      get name(): string {
        return this.properties.name;
      }
    }

    console.log('Testing rules hook with admin name...');

    let caughtError: Error | null = null;

    try {
      const user = new TestUser({
        name: 'admin',
        email: 'admin@example.com',
      });
      console.log('User was created (should not happen):', user);
    } catch (error) {
      caughtError = error as Error;
      console.log('Caught error type:', caughtError.constructor.name);
      console.log(
        'Is ValidationError:',
        caughtError instanceof ValidationError
      );
    }

    expect(caughtError).toBeInstanceOf(ValidationError);
  });
});
