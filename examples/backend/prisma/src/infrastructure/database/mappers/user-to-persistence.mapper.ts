import { Mapper } from "@woltz/rich-domain";
import { User } from "../../../domain/user/user.entity";
import { Prisma } from "@prisma/client";

type Props = Partial<Prisma.UserCreateArgs["data"]> &
  Partial<Prisma.UserUpdateArgs["data"]>;

export class PrismaUserToPersistenceMapper extends Mapper<User, Props> {
  public build(user: User): Props {
    let data = {} as Props;

    if (user.isNew()) {
      data = {
        id: user.id.value,
        email: user.email,
        name: user.name,
        posts: {
          createMany: {
            data: user.posts.map((post) => ({
              id: post.id.value,
              title: post.title,
              content: post.content,
              published: post.published,
              authorId: post.authorId,
              createdAt: post.createdAt,
              updatedAt: post.updatedAt,
            })),
            skipDuplicates: true,
          },
        },
      };
    } else {
      user.subscribe({
        updatedAt: {
          onChange: ({ current }) => {
            data.updatedAt = current;
          },
        },
        email: {
          onChange: ({ current }) => {
            data.email = current;
          },
        },
        name: {
          onChange: ({ current }) => {
            data.name = current;
          },
        },
        posts: {
          onChange: ({ toCreate, toDelete, toUpdate }) => {
            if (!data.posts) data.posts = {};

            data.posts.createMany = {
              data: toCreate.map((post) => ({
                id: post.id.value,
                title: post.title,
                content: post.content,
                published: post.published,
                authorId: post.authorId,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
              })),
              skipDuplicates: true,
            };

            data.posts.deleteMany = toDelete.map((post) => ({
              id: post.id.value,
            }));

            data.posts.updateMany = toUpdate.map((post) => ({
              where: { id: post.id.value },
              data: {
                title: post.title,
                content: post.content,
                published: post.published,
                authorId: post.authorId,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
              },
            }));
          },
        },
      });
    }

    return data;
  }
}
