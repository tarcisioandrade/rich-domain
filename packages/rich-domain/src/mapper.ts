export abstract class Mapper<Input, Output> {
  public abstract build(input: Input, ...args: unknown[]): Output;
}
