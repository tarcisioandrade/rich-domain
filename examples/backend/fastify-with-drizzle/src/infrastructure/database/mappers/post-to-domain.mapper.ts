import { Id, Mapper } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import { Tag } from "../../../domain/tag/tags";
import { PostRecord } from "../schema";

export class PostToDomainMapper extends Mapper<PostRecord, Post> {
  build(record: PostRecord): Post {
    return Post.restore({
      id: new Id(record.id),
      title: record.title,
      content: record.content,
      published: record.published,
      authorId: record.authorId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      tags: (record.tags ?? []).map(
        ({ tag }) => new Tag({ id: new Id(tag.id) })
      ),
    });
  }
}
