import { UserRepository } from "../../../domain/user/user.repository";

export class ChangeNameUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(id: string, name: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    user.updateName(name);

    await this.userRepository.createOrUpdate(user);
  }
}
