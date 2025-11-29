import { WriteAndRead } from "@woltz/rich-domain/dist/repository/base-repository";
import { Post } from "./post.entity";

export abstract class PostRepository extends WriteAndRead<Post> {}
