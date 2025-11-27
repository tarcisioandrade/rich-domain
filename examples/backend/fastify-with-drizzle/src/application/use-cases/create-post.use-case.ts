import { Post } from '../../domain/entities/post.entity';
import { IPostRepository } from '../../domain/repositories/post.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { Id } from '@woltz/rich-domain';

export interface CreatePostInput {
  title: string;
  content: string;
  userId: string;
}

export class CreatePostUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(input: CreatePostInput): Promise<Post> {
    // Verify user exists
    const user = await this.userRepository.findById(new Id(input.userId));
    if (!user) {
      throw new Error('User not found');
    }

    const post = new Post({
      id: new Id(),
      title: input.title,
      content: input.content,
      userId: input.userId,
      published: false,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.postRepository.save(post);

    return post;
  }
}
