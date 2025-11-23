import { Mapper } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import { Prisma } from "@prisma/client";

type Props = Partial<Prisma.PostCreateArgs["data"]> &
  Partial<Prisma.PostUpdateArgs["data"]>;

export class PrismaPostToPersistenceMapper extends Mapper<Post, Props> {
  public build(post: Post): Props {
    let data = {} as Props;

    if (post.isNew()) {
      data = {
        id: post.id.value,
        title: post.title,
        content: post.content,
        published: post.published,
        authorId: post.authorId,
      };
    } else {
      post.subscribe({
        title: {
          onChange: ({ current }) => {
            data.title = current;
          },
        },
        content: {
          onChange: ({ current }) => {
            data.content = current;
          },
        },
        published: {
          onChange: ({ current }) => {
            data.published = current;
          },
        },
        authorId: {
          onChange: ({ current }) => {
            data.authorId = current;
          },
        },
        updatedAt: {
          onChange: ({ current }) => {
            data.updatedAt = current;
          },
        },
      });
    }

    return data;
  }
}
