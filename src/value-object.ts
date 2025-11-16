// ============================================================================
// Value Object - Immutable Domain Objects
// ============================================================================

export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<T>): boolean {
    if (!other || !(other instanceof ValueObject)) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  toJson(): T {
    return { ...this.props };
  }

  /**
   * Create a new ValueObject with updated properties
   * Since ValueObjects are immutable, this returns a new instance
   */
  protected clone(updates: Partial<T>): this {
    const Constructor = this.constructor as new (props: T) => this;
    return new Constructor({ ...this.props, ...updates });
  }
}
