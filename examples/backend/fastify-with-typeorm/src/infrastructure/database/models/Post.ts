import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "typeorm";
import { UserEntity } from "./User";
import { TagEntity } from "./Tag";

@Entity("posts")
export class PostEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  title!: string;

  @Column({ name: "main_content", type: "varchar" })
  mainContent!: string;

  @Column({ type: "boolean", default: false })
  published!: boolean;

  @Column({ name: "author_id", type: "uuid" })
  authorId!: string;

  @ManyToOne(() => UserEntity, (user) => user.posts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "author_id" })
  author!: UserEntity;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToMany(() => TagEntity, (tag) => tag.posts)
  @JoinTable({
    name: "_PostToTag",
    joinColumn: { name: "A", referencedColumnName: "id" },
    inverseJoinColumn: { name: "B", referencedColumnName: "id" },
  })
  tags?: TagEntity[];
}
