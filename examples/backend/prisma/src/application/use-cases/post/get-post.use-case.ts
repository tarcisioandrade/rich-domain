import { Post } from "../../../domain/post/post.entity";
import { PostRepository } from "../../../domain/post/post.repository";

export class GetPostUseCase {
  constructor(private postRepository: PostRepository) {}

  async execute(id: string): Promise<Post> {
    const post = await this.postRepository.findById(id);

    if (!post) {
      throw new Error("Post not found");
    }

    return post;
  }
}
