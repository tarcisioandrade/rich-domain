export class Policy<T> {
  protected _specification: T;
  constructor(policy: T) {
    this._specification = policy;
  }

  get specification() {
    return this._specification;
  }

  public static use<T>(policy: Policy<T>): T {
    return policy.specification;
  }
}
