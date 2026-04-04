import { Id, Mapper } from "@woltz/rich-domain";
import { User } from "../../../domain/user/user.entity";
import { Post } from "../../../domain/post/post.entity";
import { Tag } from "../../../domain/tag/tags";
import { UserWithPosts } from "../schema";

export class UserToDomainMapper extends Mapper<UserWithPosts, User> {
  build(record: UserWithPosts): User {
    return User.restore({
      id: new Id(record.id),
      email: record.email,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      posts: (record.posts ?? []).map((p) =>
        Post.restore({
          id: new Id(p.id),
          title: p.title,
          content: p.content,
          published: p.published,
          authorId: p.authorId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          tags: (p.tags ?? []).map(
            ({ tag }) => new Tag({ id: new Id(tag.id) })
          ),
        })
      ),
    });
  }
}
