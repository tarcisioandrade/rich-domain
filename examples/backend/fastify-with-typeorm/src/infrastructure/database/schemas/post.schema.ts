import { PostEntity } from "../models/Post";

export type PostSchema = PostEntity & {
  tags?: { id: string }[];
};
