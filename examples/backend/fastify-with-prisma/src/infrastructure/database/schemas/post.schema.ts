import { Prisma } from "@prisma/client";

export type PostSchema = Prisma.PostGetPayload<{
  include: {
    tagPosts: {
      include: {
        tag: true;
      };
    };
  };
}>;
