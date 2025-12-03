import { Criteria, EntityNotFoundError, Id } from "@woltz/rich-domain";
import { Post, PostProps } from "../../domain/post/post.entity";
import { PostRepository } from "../../domain/post/post.repository";
import { UserRepository } from "../../domain/user/user.repository";

interface CreatePostInput {
  title: string;
  content: string;
  authorId: string;
}

export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository
  ) {}

  async create(input: CreatePostInput) {
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

    await this.postRepository.save(post);

    return post;
  }

  async getById(id: string): Promise<Post> {
    const post = await this.postRepository.findById(id);

    if (!post) {
      throw new EntityNotFoundError("Post", id);
    }

    return post;
  }

  async list(criteria: Criteria) {
    return await this.postRepository.find(criteria);
  }

  async publish(id: string): Promise<Post> {
    const post = await this.getById(id);

    post.publish();

    await this.postRepository.save(post);

    return post;
  }

  async update(id: string, input: Partial<PostProps>) {
    const post = await this.getById(id);

    if (input.title) {
      post.updateTitle(input.title);
    }
    if (input.content) {
      post.updateContent(input.content);
    }

    await this.postRepository.save(post);

    return post.toJSON();
  }
}
