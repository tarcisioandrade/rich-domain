import { randomUUID } from 'crypto';
// ============================================================================
// Id Class - Smart Identity Management
// ============================================================================

export class Id {
  private readonly _value: string;
  private readonly _isNew: boolean;

  /**
   * Create a new Id
   * @param value - Optional existing ID value. If not provided, generates a new UUID.
   *
   * @example
   * // New entity (generates UUID)
   * const newId = new Id();
   * newId.isNew // true
   *
   * // Existing entity (uses provided ID)
   * const existingId = new Id("550e8400-e29b-41d4-a716-446655440000");
   * existingId.isNew // false
   */
  constructor(value?: string) {
    if (value !== undefined) {
      // ID was provided - this is an existing entity
      this._value = value;
      this._isNew = false;
    } else {
      // No ID provided - generate new one, this is a new entity
      this._value = this.generateUUID();
      this._isNew = true;
    }
  }

  /**
   * Get the string value of the ID
   */
  get value(): string {
    return this._value;
  }

  /**
   * Check if this ID represents a new entity
   */
  get isNew(): boolean {
    return this._isNew;
  }

  /**
   * Convert to string (for JSON serialization and comparisons)
   */
  toString(): string {
    return this._value;
  }

  /**
   * Convert to JSON (returns the string value)
   */
  toJSON(): string {
    return this._value;
  }

  /**
   * Check equality with another Id or string
   */
  equals(other: Id | string): boolean {
    if (other instanceof Id) {
      return this._value === other._value;
    }
    return this._value === other;
  }

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    // Simple UUID v4 implementation
    return randomUUID();
  }

  /**
   * Create a new Id (convenience static method)
   */
  static create(): Id {
    return new Id();
  }

  /**
   * Create an Id from an existing value
   */
  static from(value: string): Id {
    return new Id(value);
  }
}
