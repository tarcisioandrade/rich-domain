import { UserEntity } from "../models/User";
import { PostEntity } from "../models/Post";

export type UserSchema = UserEntity & {
  posts?: (PostEntity & {
    tags?: { id: string }[];
  })[];
};
