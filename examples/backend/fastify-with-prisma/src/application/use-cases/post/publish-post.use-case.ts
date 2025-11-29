import { PostRepository } from "../../../domain/post/post.repository";

export class PublishPostUseCase {
  constructor(private postRepository: PostRepository) {}

  async execute(id: string) {
    const post = await this.postRepository.findById(id);

    if (!post) {
      throw new Error("Post not found");
    }

    post.publish();

    await this.postRepository.save(post);

    return post;
  }
}
