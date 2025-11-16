// Debug test to identify the exact issue
import { z } from 'zod';
import { Id } from '../src';

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

describe('Debug Standard Schema', () => {
  it('should have ~standard property', () => {
    console.log('Schema keys:', Object.keys(userSchema));
    console.log('Has ~standard:', '~standard' in userSchema);
    console.log('~standard type:', typeof (userSchema as any)['~standard']);

    expect('~standard' in userSchema).toBe(true);
  });

  it('should validate correctly via ~standard', () => {
    const testData = {
      id: new Id(),
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      status: 'active' as const,
    };

    const result = (userSchema as any)['~standard'].validate(testData);
    console.log('Validation result:', result);
    console.log('Result type:', typeof result);
    console.log('Is Promise:', result instanceof Promise);

    expect(result).toBeDefined();
    expect(result.issues).toBeUndefined();
  });

  it('should return issues for invalid data', () => {
    const testData = {
      id: new Id(),
      name: 'J', // Too short
      email: 'invalid', // Invalid email
      age: 25,
      status: 'active' as const,
    };

    const result = (userSchema as any)['~standard'].validate(testData);
    console.log('Invalid data result:', JSON.stringify(result, null, 2));
    console.log('Issues:', result.issues);

    expect(result.issues).toBeDefined();
    expect(result.issues.length).toBeGreaterThan(0);

    // Check issue structure
    if (result.issues && result.issues.length > 0) {
      console.log('First issue:', result.issues[0]);
      console.log('First issue path:', result.issues[0].path);
      console.log('First issue message:', result.issues[0].message);
    }
  });

  it('should test the actual entity creation flow', () => {
    // Simulate what BaseEntity does
    const props = {
      id: new Id(),
      name: 'J', // Invalid - too short
      email: 'invalid@email', // Valid email format actually
      age: 18,
      status: 'active' as const,
    };

    console.log('Props to validate:', props);

    const schema = userSchema as any;
    console.log('Schema ~standard exists:', !!schema['~standard']);
    console.log(
      'Schema ~standard.validate exists:',
      !!schema['~standard']?.validate
    );

    try {
      const result = schema['~standard'].validate(props);
      console.log('Result:', result);
      console.log('Has issues:', !!result.issues);

      if (result.issues && result.issues.length > 0) {
        console.log('Validation issues found:', result.issues.length);
        result.issues.forEach((issue: any, i: number) => {
          console.log(`Issue ${i}:`, issue);
        });
      }
    } catch (error) {
      console.error('Error during validation:', error);
      throw error;
    }
  });
});
