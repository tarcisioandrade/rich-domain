import { Id } from "@woltz/rich-domain";
import { Post } from "../../../domain/post/post.entity";
import { PostRepository } from "../../../domain/post/post.repository";
import { UserRepository } from "../../../domain/user/user.repository";

interface CreatePostInput {
  title: string;
  content: string;
  authorId: string;
}

export class CreatePostUseCase {
  constructor(
    private postRepository: PostRepository,
    private userRepository: UserRepository
  ) {}

  async execute(input: CreatePostInput): Promise<Post> {
    const author = await this.userRepository.findById(input.authorId);

    if (!author) {
      throw new Error("Author not found");
    }

    const post = new Post({
      id: new Id(),
      title: input.title,
      content: input.content,
      authorId: input.authorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      published: false,
    });

    await this.postRepository.create(post);

    return post;
  }
}
