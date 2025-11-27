import { User } from "@/domain/entities/user.entity";
import { UserRow } from "../schema";
import { Id, Mapper } from "@woltz/rich-domain";

export class UserToDomainMapper implements Mapper<UserRow, User> {
  public build(persistence: UserRow): User {
    return new User({
      id: new Id(persistence.id),
      name: persistence.name,
      email: persistence.email,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt,
    });
  }
}
