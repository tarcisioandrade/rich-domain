import { Post } from "../entities/post.entity";
import { WriteAndRead } from "@woltz/rich-domain";

export abstract class IPostRepository extends WriteAndRead<Post> {}
