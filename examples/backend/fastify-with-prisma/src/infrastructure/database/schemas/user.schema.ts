import { Prisma } from "@prisma/client";

export type UserSchema = Prisma.UserGetPayload<{
  include: {
    posts: true;
  };
}>;
