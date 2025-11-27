import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { Id } from '@woltz/rich-domain';

export interface UpdateUserInput {
  id: string;
  name?: string;
  email?: string;
}

export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: UpdateUserInput): Promise<User> {
    const user = await this.userRepository.findById(new Id(input.id));
    if (!user) {
      throw new Error('User not found');
    }

    if (input.name !== undefined && input.email !== undefined) {
      user.updateProfile(input.name, input.email);
    } else if (input.name !== undefined) {
      user.name = input.name;
    } else if (input.email !== undefined) {
      user.email = input.email;
    }

    await this.userRepository.save(user);

    return user;
  }
}
