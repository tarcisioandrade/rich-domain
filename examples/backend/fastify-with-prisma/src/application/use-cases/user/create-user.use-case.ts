import { Id } from "@woltz/rich-domain";
import { User } from "../../../domain/user/user.entity";
import { UserRepository } from "../../../domain/user/user.repository";
import { EVENT_BUS } from "../../../infrastructure/queue/event-bus";
import { PrismaUnitOfWork } from "../../../infrastructure/database/unit-of-work";
import { prisma } from "../../../infrastructure/database/prisma";

interface CreateUserInput {
  email: string;
  name: string;
}

export class CreateUserUseCase {
  private uow = new PrismaUnitOfWork(prisma);
  constructor(private userRepository: UserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    // 
    return await this.userRepository.uow.transaction(async () => {
      const existingUser = await this.userRepository.findByEmail(input.email);

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const user = new User({
        id: new Id(),
        email: input.email,
        name: input.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        posts: [],
      });

      await this.userRepository.createOrUpdate(user);
      await user.dispatchAll(EVENT_BUS);

      return user;
    });
  }
}
