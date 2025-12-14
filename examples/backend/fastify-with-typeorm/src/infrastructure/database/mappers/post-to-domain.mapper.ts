import { Post } from "../../../domain/post/post.entity";
import { PostSchema } from "../schemas/post.schema";
import { Id, Mapper } from "@woltz/rich-domain";
import { Tag } from "../../../domain/value-objects/tags";

export class PostToDomainMapper extends Mapper<PostSchema, Post> {
  public build(post: PostSchema): Post {
    return Post.restore({
      id: new Id(post.id),
      title: post.title,
      content: post.mainContent,
      published: post.published,
      tags:
        post.tags?.map(
          (tag) =>
            new Tag({
              id: new Id(tag.id),
            })
        ) ?? [],
      authorId: post.authorId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    });
  }
}
