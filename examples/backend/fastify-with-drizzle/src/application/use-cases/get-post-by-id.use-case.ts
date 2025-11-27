import { Post } from '../../domain/entities/post.entity';
import { IPostRepository } from '../../domain/repositories/post.repository';
import { Id } from '@woltz/rich-domain';

export class GetPostByIdUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(id: string): Promise<Post | null> {
    return this.postRepository.findById(new Id(id));
  }
}
