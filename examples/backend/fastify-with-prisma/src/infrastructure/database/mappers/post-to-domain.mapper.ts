import { Mapper } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import { PostSchema } from "../schemas/post.schema";
import { Id } from "@woltz/rich-domain";

export class PrismaPostToDomainMapper extends Mapper<PostSchema, Post> {
  public build(post: PostSchema): Post {
    return Post.restore({
      id: new Id(post.id),
      title: post.title,
      content: post.main_content,
      published: post.published,
      authorId: post.authorId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    });
  }
}
