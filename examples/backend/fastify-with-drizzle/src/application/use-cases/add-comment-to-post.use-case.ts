import { Post } from '../../domain/entities/post.entity';
import { Comment } from '../../domain/entities/comment.entity';
import { IPostRepository } from '../../domain/repositories/post.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { Id } from '@woltz/rich-domain';

export interface AddCommentToPostInput {
  postId: string;
  userId: string;
  content: string;
}

export class AddCommentToPostUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(input: AddCommentToPostInput): Promise<Post> {
    // Verify user exists
    const user = await this.userRepository.findById(new Id(input.userId));
    if (!user) {
      throw new Error('User not found');
    }

    // Get post
    const post = await this.postRepository.findById(new Id(input.postId));
    if (!post) {
      throw new Error('Post not found');
    }

    // Create comment
    const comment = new Comment({
      id: new Id(),
      content: input.content,
      userId: input.userId,
      postId: input.postId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add comment to post
    post.addComment(comment);

    // Save post (with cascade save of comment)
    await this.postRepository.save(post);

    return post;
  }
}
