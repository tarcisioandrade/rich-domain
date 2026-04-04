import { Criteria, EntityNotFoundError, Id } from "@woltz/rich-domain";
import { Post, PostProps } from "../../domain/post/post.entity";
import { PostRepository } from "../../domain/post/post.repository";
import { UserRepository } from "../../domain/user/user.repository";
import { Tag } from "../../domain/tag/tags";

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

  async create(input: CreatePostInput): Promise<Post> {
    const author = await this.userRepository.findById(input.authorId);
    if (!author) throw new EntityNotFoundError("User", input.authorId);

    const post = new Post({
      id: new Id(),
      title: input.title,
      content: input.content,
      authorId: input.authorId,
      published: false,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.postRepository.save(post);
    return post;
  }

  async getById(id: string): Promise<Post> {
    const post = await this.postRepository.findById(id);
    if (!post) throw new EntityNotFoundError("Post", id);
    return post;
  }

  async list(criteria: Criteria) {
    return this.postRepository.find(criteria);
  }

  async publish(id: string): Promise<Post> {
    const post = await this.getById(id);
    post.publish();
    await this.postRepository.save(post);
    return post;
  }

  async update(id: string, input: Partial<PostProps>): Promise<Post> {
    const post = await this.getById(id);
    if (input.title) post.updateTitle(input.title);
    if (input.content) post.updateContent(input.content);
    await this.postRepository.save(post);
    return post;
  }

  async addTag(id: string, tagId: string): Promise<void> {
    const post = await this.getById(id);
    post.addTag(new Tag({ id: new Id(tagId) }));
    await this.postRepository.save(post);
  }

  async removeTag(id: string, tagId: string): Promise<void> {
    const post = await this.getById(id);
    post.removeTag(new Tag({ id: new Id(tagId) }));
    await this.postRepository.save(post);
  }
}
