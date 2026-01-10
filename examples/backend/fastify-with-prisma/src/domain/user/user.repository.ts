import { User } from "./user.entity";
import { Repository } from "@woltz/rich-domain";

export abstract class UserRepository extends Repository<User> {
  abstract findByEmail(email: string): Promise<User | null>;
}
