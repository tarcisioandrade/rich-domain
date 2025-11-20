import { Id, Aggregate, Criteria, BaseProps, PaginatedResult } from "../src";
import { InMemoryRepository, Mapper } from "../src/repository";
import { Repository } from "../src/repository/base-repository";

// ============================================================================
// Test Domain Models
// ============================================================================

interface UserProps extends BaseProps {
  name: string;
  email: string;
  age: number;
  status: "active" | "inactive";
}

class User extends Aggregate<UserProps> {
  get name() {
    return this.props.name;
  }

  get email() {
    return this.props.email;
  }

  get age() {
    return this.props.age;
  }

  get status() {
    return this.props.status;
  }

  setName(name: string) {
    this.props.name = name;
  }

  activate() {
    this.props.status = "active";
  }

  deactivate() {
    this.props.status = "inactive";
  }

  static create(props: Omit<UserProps, "id"> & { id?: Id }): User {
    return new User({
      id: props.id || new Id(),
      name: props.name,
      email: props.email,
      age: props.age,
      status: props.status,
    });
  }
}

// ============================================================================
// Mock Persistence Model
// ============================================================================

type UserPersistence = {
  id: string;
  name: string;
  email: string;
  age: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Mapper Implementation
// ============================================================================
class UserToDomainMapper extends Mapper<UserPersistence, User> {
  public build(persistence: UserPersistence): User {
    return User.create({
      id: Id.from(persistence.id),
      name: persistence.name,
      email: persistence.email,
      age: persistence.age,
      status: persistence.status as "active" | "inactive",
    });
  }
}

class UserToPersistenceMapper extends Mapper<User, UserPersistence> {
  public build(domain: User): UserPersistence {
    return {
      id: domain.id.value,
      name: domain.name,
      email: domain.email,
      age: domain.age,
      status: domain.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

// ============================================================================
// Mock Repository Implementation
// ============================================================================

class MockUserRepository extends Repository<User> {
  private store: Map<string, UserPersistence> = new Map();

  constructor(
    protected readonly mapperToDomain: Mapper<UserPersistence, User>,
    protected readonly mapperToPersistence: Mapper<User, UserPersistence>
  ) {
    super();
  }

  get model() {
    return "users";
  }

  async create(entity: User) {
    const persistence = this.mapperToPersistence.build(entity);
    this.store.set(entity.id.value, persistence);
  }

  async delete(entity: User): Promise<void> {
    this.store.delete(entity.id.value);
  }

  async count(criteria: Criteria<User>): Promise<number> {
    return this.applyCriteria(criteria).then((result) => result.meta.total);
  }

  async exists(id: string): Promise<boolean> {
    return this.store.has(id);
  }

  async find(criteria: Criteria<User>): Promise<PaginatedResult<User>> {
    const result = await this.applyCriteria(criteria);
    return result;
  }

  async findById(id: string): Promise<User | null> {
    const persistence = this.store.get(id);
    if (!persistence) return null;
    return this.mapperToDomain.build(persistence);
  }

  async update(entity: User): Promise<void> {
    const persistence = this.mapperToPersistence.build(entity);
    this.store.set(entity.id.value, persistence);
  }

  protected async applyCriteria(criteria: Criteria<User>) {
    let results = Array.from(this.store.values());

    // Apply filters
    for (const filter of criteria.getFilters()) {
      results = results.filter((item: any) => {
        const value = item[filter.field];
        switch (filter.operator) {
          case "equals":
            return value === filter.value;
          case "greaterThan":
            return value > (filter.value as any);
          case "lessThan":
            return value < (filter.value as any);
          case "contains":
            return String(value)
              .toLowerCase()
              .includes(String(filter.value).toLowerCase());
          default:
            return true;
        }
      });
    }

    const total = results.length;

    // Apply ordering
    for (const order of criteria.getOrders()) {
      results.sort((a: any, b: any) => {
        const aVal = a[order.field];
        const bVal = b[order.field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return order.direction === "desc" ? -comparison : comparison;
      });
    }

    // Apply pagination
    const pagination = criteria.getPagination();

    results = results.slice(
      pagination.offset,
      pagination.offset + pagination.limit
    );

    const domains = results.map((p) => this.mapperToDomain.build(p));

    return PaginatedResult.create(domains, pagination, total);
  }

  protected async countByCriteria(criteria?: Criteria<User>): Promise<number> {
    if (!criteria) {
      return this.store.size;
    }

    const result = await this.applyCriteria(criteria);
    return result.meta.total;
  }

  protected async existsById(id: string): Promise<boolean> {
    return this.store.has(id);
  }

  // Test helper
  clear() {
    this.store.clear();
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("Repository", () => {
  describe("InMemoryRepository", () => {
    let repository: InMemoryRepository<User>;
    let user1: User;
    let user2: User;
    let user3: User;

    beforeEach(() => {
      repository = new InMemoryRepository<User>(
        new UserToDomainMapper(),
        new UserToPersistenceMapper()
      );

      user1 = User.create({
        name: "Alice",
        email: "alice@example.com",
        age: 25,
        status: "active",
      });

      user2 = User.create({
        name: "Bob",
        email: "bob@example.com",
        age: 30,
        status: "active",
      });

      user3 = User.create({
        name: "Charlie",
        email: "charlie@example.com",
        age: 35,
        status: "inactive",
      });
    });

    afterEach(() => {
      repository.clear();
    });

    describe("save and findById", () => {
      it("should save and retrieve user", async () => {
        await repository.create(user1);
        const found = await repository.findById(user1.id.value);

        expect(found).toBeDefined();
        expect(found?.id.equals(user1.id)).toBe(true);
        expect(found?.name).toBe("Alice");
      });

      it("should return null for non-existent id", async () => {
        const found = await repository.findById(new Id().value);
        expect(found).toBeNull();
      });

      it("should update existing user", async () => {
        await repository.create(user1);
        user1.setName("Alice Updated");
        await repository.create(user1);

        const found = await repository.findById(user1.id.value);
        expect(found?.name).toBe("Alice Updated");
      });
    });

    describe("findAll", () => {
      it("should return empty array when no users", async () => {
        const users = await repository.findAll();
        expect(users).toHaveLength(0);
      });

      it("should return all users", async () => {
        await repository.create(user1);
        await repository.create(user2);
        await repository.create(user3);

        const users = await repository.findAll();
        expect(users).toHaveLength(3);
      });

      it("should return users matching criteria", async () => {
        await repository.create(user1);
        await repository.create(user2);
        await repository.create(user3);

        const criteria = Criteria.create<User>().whereEquals(
          "status",
          "active"
        );
        const users = await repository.findAll(criteria);

        expect(users).toHaveLength(2);
        expect(users.every((u) => u.status === "active")).toBe(true);
      });
    });

    describe("find with Criteria", () => {
      beforeEach(async () => {
        await repository.create(user1);
        await repository.create(user2);
        await repository.create(user3);
      });

      it("should filter by equals", async () => {
        const criteria = Criteria.create<User>().whereEquals(
          "status",
          "active"
        );
        const result = await repository.find(criteria);

        expect(result.data).toHaveLength(2);
        expect(result.meta.total).toBe(2);
      });

      it("should order by field", async () => {
        const criteria = Criteria.create<User>().orderByDesc("age");
        const result = await repository.find(criteria);

        expect(result.data[0].age).toBe(35);
        expect(result.data[1].age).toBe(30);
        expect(result.data[2].age).toBe(25);
      });

      it("should paginate results", async () => {
        const criteria = Criteria.create<User>()
          .orderByAsc("age")
          .paginate(1, 2);

        const result = await repository.find(criteria);

        expect(result.data).toHaveLength(2);
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(2);
        expect(result.meta.total).toBe(3);
        expect(result.meta.totalPages).toBe(2);
        expect(result.meta.hasNext).toBe(true);
        expect(result.meta.hasPrevious).toBe(false);
      });

      it("should combine filter, order, and pagination", async () => {
        const criteria = Criteria.create<User>()
          .whereEquals("status", "active")
          .orderByDesc("age")
          .paginate(1, 1);

        const result = await repository.find(criteria);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].age).toBe(30); // Bob (highest age among active)
        expect(result.meta.total).toBe(2); // Total active users
      });
    });

    describe("findOne", () => {
      it("should find first matching user", async () => {
        await repository.create(user1);
        await repository.create(user2);

        const criteria = Criteria.create<User>().whereEquals(
          "status",
          "active"
        );
        const found = await repository.findOne(criteria);

        expect(found).toBeDefined();
        expect(found?.status).toBe("active");
      });

      it("should return null when no match", async () => {
        const criteria = Criteria.create<User>().whereEquals(
          "status",
          "active"
        );
        const found = await repository.findOne(criteria);

        expect(found).toBeNull();
      });
    });

    describe("delete", () => {
      it("should delete by aggregate", async () => {
        await repository.create(user1);
        await repository.delete(user1);

        const found = await repository.findById(user1.id.value);
        expect(found).toBeNull();
      });

      it("should delete by id", async () => {
        await repository.create(user1);
        await repository.delete(user1);

        const found = await repository.findById(user1.id.value);
        expect(found).toBeNull();
      });
    });

    describe("exists", () => {
      it("should return true when user exists", async () => {
        await repository.create(user1);
        const exists = await repository.exists(user1.id.value);
        expect(exists).toBe(true);
      });

      it("should return false when user does not exist", async () => {
        const exists = await repository.exists(new Id().value);
        expect(exists).toBe(false);
      });
    });

    describe("count", () => {
      beforeEach(async () => {
        await repository.create(user1);
        await repository.create(user2);
        await repository.create(user3);
      });

      it("should count all users", async () => {
        const count = await repository.count();
        expect(count).toBe(3);
      });

      it("should count users matching criteria", async () => {
        const criteria = Criteria.create<User>().whereEquals(
          "status",
          "active"
        );
        const count = await repository.count(criteria);
        expect(count).toBe(2);
      });
    });

    describe("saveMany", () => {
      it("should save multiple users", async () => {
        await repository.createMany([user1, user2, user3]);

        const users = await repository.findAll();
        expect(users).toHaveLength(3);
      });
    });
  });

  describe("BaseRepository with Mapper", () => {
    let repository: MockUserRepository;
    let user: User;

    beforeEach(() => {
      repository = new MockUserRepository(
        new UserToDomainMapper(),
        new UserToPersistenceMapper()
      );
      user = User.create({
        name: "John",
        email: "john@example.com",
        age: 28,
        status: "active",
      });
    });

    afterEach(() => {
      repository.clear();
    });

    it("should save new user (insert)", async () => {
      expect(user.isNew()).toBe(true);
      await repository.create(user);

      const found = await repository.findById(user.id.value);
      expect(found).toBeDefined();
      expect(found?.name).toBe("John");
    });

    it("should update existing user", async () => {
      await repository.create(user);

      // Simulate existing user
      const existingUser = User.create({
        id: user.id, // Same ID
        name: "John Updated",
        email: "john@example.com",
        age: 29,
        status: "inactive",
      });

      await repository.create(existingUser);

      const found = await repository.findById(user.id.value);
      expect(found?.name).toBe("John Updated");
      expect(found?.age).toBe(29);
    });

    it("should convert between domain and persistence", async () => {
      await repository.create(user);
      const found = await repository.findById(user.id.value);

      // Should be a domain object
      expect(found).toBeInstanceOf(User);
      expect(found?.id).toBeInstanceOf(Id);
    });

    it("should apply criteria correctly", async () => {
      const user1 = User.create({
        name: "Alice",
        email: "alice@example.com",
        age: 25,
        status: "active",
      });
      const user2 = User.create({
        name: "Bob",
        email: "bob@example.com",
        age: 30,
        status: "inactive",
      });

      await Promise.all([repository.create(user1), repository.create(user2)]);

      const result = await repository.find(
        Criteria.create<User>()
          .whereEquals("status", "active")
          .orderByDesc("age")
          .paginate(1, 10)
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Alice");
    });
  });

  describe("Mapper", () => {
    let toDomainMapper: UserToDomainMapper;
    let toPersistenceMapper: UserToPersistenceMapper;

    beforeEach(() => {
      toDomainMapper = new UserToDomainMapper();
      toPersistenceMapper = new UserToPersistenceMapper();
    });

    it("should convert from persistence to domain", () => {
      const persistence: UserPersistence = {
        id: "123",
        name: "John",
        email: "john@example.com",
        age: 30,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const domain = toDomainMapper.build(persistence);

      expect(domain).toBeInstanceOf(User);
      expect(domain.id.value).toBe("123");
      expect(domain.name).toBe("John");
      expect(domain.email).toBe("john@example.com");
      expect(domain.age).toBe(30);
      expect(domain.status).toBe("active");
    });

    it("should convert from domain to persistence", () => {
      const domain = User.create({
        id: Id.from("123"),
        name: "John",
        email: "john@example.com",
        age: 30,
        status: "active",
      });

      const persistence = toPersistenceMapper.build(domain);

      expect(persistence.id).toBe("123");
      expect(persistence.name).toBe("John");
      expect(persistence.email).toBe("john@example.com");
      expect(persistence.age).toBe(30);
      expect(persistence.status).toBe("active");
      expect(persistence.createdAt).toBeInstanceOf(Date);
      expect(persistence.updatedAt).toBeInstanceOf(Date);
    });

    it("should convert list from persistence to domain", () => {
      const persistenceList: UserPersistence[] = [
        {
          id: "1",
          name: "Alice",
          email: "alice@example.com",
          age: 25,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Bob",
          email: "bob@example.com",
          age: 30,
          status: "inactive",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const domainList = persistenceList.map((p) => toDomainMapper.build(p));

      expect(domainList).toHaveLength(2);
      expect(domainList[0]).toBeInstanceOf(User);
      expect(domainList[0].name).toBe("Alice");
      expect(domainList[1].name).toBe("Bob");
    });

    it("should convert list from domain to persistence", () => {
      const domainList = [
        User.create({
          id: Id.from("1"),
          name: "Alice",
          email: "alice@example.com",
          age: 25,
          status: "active",
        }),
        User.create({
          id: Id.from("2"),
          name: "Bob",
          email: "bob@example.com",
          age: 30,
          status: "inactive",
        }),
      ];

      const persistenceList = domainList.map((d) =>
        toPersistenceMapper.build(d)
      );

      expect(persistenceList).toHaveLength(2);
      expect(persistenceList[0].id).toBe("1");
      expect(persistenceList[0].name).toBe("Alice");
      expect(persistenceList[1].name).toBe("Bob");
    });
  });
});
