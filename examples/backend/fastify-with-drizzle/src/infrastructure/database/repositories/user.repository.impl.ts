import { eq } from 'drizzle-orm';
import { Database } from '../connection';
import { users } from '../schema';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { User, UserProps } from '../../../domain/entities/user.entity';
import { Id } from '@woltz/rich-domain';

export class UserRepositoryImpl implements IUserRepository {
  constructor(private readonly db: Database) {}

  async save(user: User): Promise<void> {
    const userData = {
      id: user.id.value,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (user.id.isNew) {
      await this.db.insert(users).values(userData);
    } else {
      await this.db
        .update(users)
        .set(userData)
        .where(eq(users.id, user.id.value));
    }
  }

  async findById(id: Id): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id.value))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    const props: UserProps = {
      id: new Id(row.id),
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    return new User(props);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    const props: UserProps = {
      id: new Id(row.id),
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    return new User(props);
  }

  async findAll(): Promise<User[]> {
    const result = await this.db.select().from(users);

    return result.map((row) => {
      const props: UserProps = {
        id: new Id(row.id),
        name: row.name,
        email: row.email,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
      return new User(props);
    });
  }

  async delete(id: Id): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id.value));
  }
}
