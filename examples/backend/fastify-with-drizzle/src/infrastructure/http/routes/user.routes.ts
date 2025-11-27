import { FastifyInstance } from 'fastify';
import { CreateUserUseCase } from '../../../application/use-cases/create-user.use-case';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id.use-case';
import { UpdateUserUseCase } from '../../../application/use-cases/update-user.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository';

export async function userRoutes(
  fastify: FastifyInstance,
  userRepository: IUserRepository
) {
  fastify.post('/users', async (request, reply) => {
    try {
      const body = request.body as { name: string; email: string };
      const createUserUseCase = new CreateUserUseCase(userRepository);
      const user = await createUserUseCase.execute(body);

      return reply.status(201).send({
        id: user.id.value,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/users/:id', async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
      const user = await getUserByIdUseCase.execute(params.id);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        id: user.id.value,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.put('/users/:id', async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const body = request.body as { name?: string; email?: string };
      const updateUserUseCase = new UpdateUserUseCase(userRepository);
      const user = await updateUserUseCase.execute({
        id: params.id,
        ...body,
      });

      return reply.send({
        id: user.id.value,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/users', async (request, reply) => {
    try {
      const users = await userRepository.findAll();

      return reply.send(
        users.map((user) => ({
          id: user.id.value,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }))
      );
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
