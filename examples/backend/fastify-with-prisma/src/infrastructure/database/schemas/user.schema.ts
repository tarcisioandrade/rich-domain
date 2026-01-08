import { Prisma } from "@prisma/client";

export type UserSchema = Prisma.UserGetPayload<{
  include: {
    posts: {
      include: {
        tagPosts: {
          include: {
            tag: true;
          };
        };
      };
    };
  };
}>;
