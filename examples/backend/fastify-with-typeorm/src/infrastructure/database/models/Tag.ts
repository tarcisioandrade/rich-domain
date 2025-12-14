import { Entity, PrimaryColumn, ManyToMany } from "typeorm";
import { PostEntity } from "./Post";

@Entity("tags")
export class TagEntity {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @ManyToMany(() => PostEntity, (post) => post.tags)
  posts!: PostEntity[];
}
