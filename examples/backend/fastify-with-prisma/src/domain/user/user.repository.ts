import { User } from "./user.entity";
import { WriteAndRead } from "@woltz/rich-domain";

export abstract class UserRepository extends WriteAndRead<User> {
  abstract findByEmail(email: string): Promise<User | null>;
}
