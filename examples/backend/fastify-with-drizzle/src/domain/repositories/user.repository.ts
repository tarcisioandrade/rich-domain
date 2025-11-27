import { User } from "../entities/user.entity";
import { WriteAndRead } from "@woltz/rich-domain";

export abstract class IUserRepository extends WriteAndRead<User> {
  abstract findByEmail(email: string): Promise<User | null>;
}
