import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db } from './infrastructure/database/connection';
import { UserRepositoryImpl } from './infrastructure/database/repositories/user.repository.impl';
import { PostRepositoryImpl } from './infrastructure/database/repositories/post.repository.impl';
import { userRoutes } from './infrastructure/http/routes/user.routes';
import { postRoutes } from './infrastructure/http/routes/post.routes';

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
  });

  // Initialize repositories
  const userRepository = new UserRepositoryImpl(db);
  const postRepository = new PostRepositoryImpl(db);

  // Register routes
  await fastify.register(
    async (fastify) => {
      await userRoutes(fastify, userRepository);
    },
    { prefix: '/api' }
  );

  await fastify.register(
    async (fastify) => {
      await postRoutes(fastify, postRepository, userRepository);
    },
    { prefix: '/api' }
  );

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  return fastify;
}
