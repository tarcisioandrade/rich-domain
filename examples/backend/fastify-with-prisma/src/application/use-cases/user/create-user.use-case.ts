import { Id } from "@woltz/rich-domain";
import { User } from "../../../domain/user/user.entity";
import { UserRepository } from "../../../domain/user/user.repository";
import { EVENT_BUS } from "../../../infrastructure/queue/event-bus";
import { PrismaUnitOfWork } from "../../../infrastructure/database/unit-of-work";

interface CreateUserInput {
  email: string;
  name: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly uow: PrismaUnitOfWork
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    return await this.uow.transaction(async () => {
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

      await this.userRepository.save(user);

      throw new Error("test");
      await user.dispatchAll(EVENT_BUS);

      return user;
    });
  }
}
