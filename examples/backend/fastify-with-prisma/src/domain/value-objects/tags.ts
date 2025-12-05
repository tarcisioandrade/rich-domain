import { Id, ValueObject, VOValidation } from "@woltz/rich-domain";
import z from "zod";

export const TagProps = z.object({
  id: z.instanceof(Id),
});

type TagProps = z.infer<typeof TagProps>;

// Value Object only to demonstratation purposes
export class Tag extends ValueObject<TagProps> {
  protected static validation: VOValidation<TagProps> = {
    schema: TagProps,
  };

  static readonly identityKey = "id";

  get id() {
    return this.props.id;
  }
}
