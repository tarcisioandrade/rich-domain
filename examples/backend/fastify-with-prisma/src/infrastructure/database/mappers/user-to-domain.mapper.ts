import { Id, Mapper } from "@woltz/rich-domain";
import { UserSchema } from "../schemas/user.schema";
import { User } from "../../../domain/user/user.entity";
import { Post } from "../../../domain/post/post.entity";

export class PrismaUserToDomainMapper extends Mapper<UserSchema, User> {
  public build(user: UserSchema): User {
    return new User({
      id: new Id(user.id),
      email: user.email,
      name: user.name,
      posts: user.posts.map((post) =>
        Post.restore({
          id: new Id(post.id),
          title: post.title,
          content: post.content,
          published: post.published,
          authorId: post.authorId,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        })
      ),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
