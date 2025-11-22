import { Address } from "./utils";

describe("Value Object", () => {
  it("should create immutable value object", () => {
    const address = new Address({
      street: "Main St",
      city: "NYC",
      zipCode: "10001",
    });

    expect(address.street).toBe("Main St");
    expect(address.city).toBe("NYC");
  });

  it("should compare value objects by value", () => {
    const address1 = new Address({
      street: "Main St",
      city: "NYC",
      zipCode: "10001",
    });

    const address2 = new Address({
      street: "Main St",
      city: "NYC",
      zipCode: "10001",
    });

    const address3 = new Address({
      street: "Broadway",
      city: "NYC",
      zipCode: "10001",
    });

    expect(address1.equals(address2)).toBe(true);
    expect(address1.equals(address3)).toBe(false);
  });

  it("should convert value object to JSON", () => {
    const address = new Address({
      street: "Main St",
      city: "NYC",
      zipCode: "10001",
    });

    const json = address.toJson();
    expect(json).toEqual({
      street: "Main St",
      city: "NYC",
      zipCode: "10001",
    });
  });
});
