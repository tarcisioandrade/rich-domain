import { User } from "../../domain/user/user.entity";
import { UserRepository } from "../../domain/user/user.repository";
import { Criteria, Id, IDomainEventBus } from "@woltz/rich-domain";

interface CreateUserInput {
  email: string;
  name: string;
}

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: IDomainEventBus
  ) {}

  async create(input: CreateUserInput): Promise<User> {
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
    await user.dispatchAll(this.eventBus);

    return user;
  }

  async changeName(id: string, name: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }
    user.updateName(name);

    await this.userRepository.save(user);
  }

  async list(criteria: Criteria) {
    return await this.userRepository.find(criteria);
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}
