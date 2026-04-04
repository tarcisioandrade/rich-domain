import { WriteAndRead } from "@woltz/rich-domain";
import { Post } from "./post.entity";

export abstract class PostRepository extends WriteAndRead<Post> {}
