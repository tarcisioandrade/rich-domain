import { EntityNotFoundError } from "@woltz/rich-domain";
import { PostProps } from "../../../domain/post/post.entity";
import { PostRepository } from "../../../domain/post/post.repository";

export class UpdatePostUseCase {
  constructor(private postRepository: PostRepository) {}

  async execute(id: string, input: Partial<PostProps>) {
    const post = await this.postRepository.findById(id);

    if (!post) {
      throw new EntityNotFoundError("Post", id);
    }

    if (input.title) {
      post.updateTitle(input.title);
    }
    if (input.content) {
      post.updateContent(input.content);
    }

    await this.postRepository.save(post);

    return post.toJson();
  }
}
