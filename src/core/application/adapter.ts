export abstract class BaseAdapter<From, To> {
  public abstract build(data: From, ...rest: any[]): To | Promise<To>;
}

export abstract class Builder<From, To> {
  protected abstract defaultValue: From;
  public abstract build(): To;
}
