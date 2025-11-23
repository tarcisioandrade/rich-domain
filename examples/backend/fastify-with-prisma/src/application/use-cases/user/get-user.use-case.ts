import { User } from "../../../domain/user/user.entity";
import { UserRepository } from "../../../domain/user/user.repository";

export class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}
