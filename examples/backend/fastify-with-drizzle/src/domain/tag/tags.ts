import { Entity, EntityValidation, Id } from "@woltz/rich-domain";
import z from "zod";

export const TagProps = z.object({
  id: z.instanceof(Id),
});

type TagProps = z.infer<typeof TagProps>;

export class Tag extends Entity<TagProps> {
  protected static validation: EntityValidation<TagProps> = {
    schema: TagProps,
  };

  get id() {
    return this.props.id;
  }
}
