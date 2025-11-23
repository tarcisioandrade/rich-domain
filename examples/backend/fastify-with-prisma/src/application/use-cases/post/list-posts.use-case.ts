import { Criteria } from "@woltz/rich-domain";
import { PostRepository } from "../../../domain/post/post.repository";

export class ListPostsUseCase {
  constructor(private postRepository: PostRepository) {}

  async execute(criteria: Criteria) {
    return await this.postRepository.find(criteria);
  }
}
