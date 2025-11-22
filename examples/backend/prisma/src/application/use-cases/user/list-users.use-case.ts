import { Criteria } from "@woltz/rich-domain";
import { UserRepository } from "../../../domain/user/user.repository";

export class ListUsersUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(criteria: Criteria) {
    return await this.userRepository.find(criteria);
  }
}
