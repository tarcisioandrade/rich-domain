import { UnitOfWork } from "@woltz/rich-domain";
import { User } from "./user.entity";
import { WriteAndRead } from "@woltz/rich-domain/dist/repository/base-repository";

export abstract class UserRepository extends WriteAndRead<User> {
  abstract uow: UnitOfWork;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract createOrUpdate(entity: User): Promise<void>;
}
