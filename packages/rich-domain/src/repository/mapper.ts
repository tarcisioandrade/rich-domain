export abstract class Mapper<Input, Output> {
  public abstract build(input: Input, ...args: unknown[]): Output;

  public buildMany(inputs: Input[]): Output[] {
    return inputs.map((input) => this.build(input));
  }
}
