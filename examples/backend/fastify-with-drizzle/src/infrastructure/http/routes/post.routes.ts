import { FastifyInstance } from 'fastify';
import { CreatePostUseCase } from '../../../application/use-cases/create-post.use-case';
import { GetPostByIdUseCase } from '../../../application/use-cases/get-post-by-id.use-case';
import { AddCommentToPostUseCase } from '../../../application/use-cases/add-comment-to-post.use-case';
import { IPostRepository } from '../../../domain/repositories/post.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';

export async function postRoutes(
  fastify: FastifyInstance,
  postRepository: IPostRepository,
  userRepository: IUserRepository
) {
  fastify.post('/posts', async (request, reply) => {
    try {
      const body = request.body as {
        title: string;
        content: string;
        userId: string;
      };
      const createPostUseCase = new CreatePostUseCase(
        postRepository,
        userRepository
      );
      const post = await createPostUseCase.execute(body);

      return reply.status(201).send({
        id: post.id.value,
        title: post.title,
        content: post.content,
        userId: post.userId,
        published: post.published,
        comments: post.comments.map((c) => ({
          id: c.id.value,
          content: c.content,
          userId: c.userId,
          postId: c.postId,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/posts/:id', async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const getPostByIdUseCase = new GetPostByIdUseCase(postRepository);
      const post = await getPostByIdUseCase.execute(params.id);

      if (!post) {
        return reply.status(404).send({ error: 'Post not found' });
      }

      return reply.send({
        id: post.id.value,
        title: post.title,
        content: post.content,
        userId: post.userId,
        published: post.published,
        comments: post.comments.map((c) => ({
          id: c.id.value,
          content: c.content,
          userId: c.userId,
          postId: c.postId,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/posts', async (request, reply) => {
    try {
      const posts = await postRepository.findAll();

      return reply.send(
        posts.map((post) => ({
          id: post.id.value,
          title: post.title,
          content: post.content,
          userId: post.userId,
          published: post.published,
          comments: post.comments.map((c) => ({
            id: c.id.value,
            content: c.content,
            userId: c.userId,
            postId: c.postId,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        }))
      );
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post('/posts/:id/comments', async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const body = request.body as { userId: string; content: string };
      const addCommentToPostUseCase = new AddCommentToPostUseCase(
        postRepository,
        userRepository
      );
      const post = await addCommentToPostUseCase.execute({
        postId: params.id,
        ...body,
      });

      return reply.status(201).send({
        id: post.id.value,
        title: post.title,
        content: post.content,
        userId: post.userId,
        published: post.published,
        comments: post.comments.map((c) => ({
          id: c.id.value,
          content: c.content,
          userId: c.userId,
          postId: c.postId,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
