import { describe, it, expect, beforeEach } from "vitest";
import { CsvExportService } from "../src/csv-export-service.js";
import {
  Repository,
  Aggregate,
  Id,
  Criteria,
  PaginatedResult,
} from "@woltz/rich-domain";

interface UserProps {
  id: Id;
  name: string;
  email: string;
  status: "active" | "inactive";
}

class User extends Aggregate<UserProps> {}

class UserRepository extends Repository<User> {
  private users: User[] = [];

  constructor(users: User[] = []) {
    super();
    this.users = users;
  }

  async find(criteria?: Criteria<User>): Promise<PaginatedResult<User>> {
    const page = criteria?.getPagination()?.page ?? 1;
    const limit = criteria?.getPagination()?.limit ?? 10;

    // Apply filters
    let filteredUsers = this.users;
    if (criteria) {
      const filters = criteria.getFilters();
      filteredUsers = this.users.filter((user) => {
        return filters.every((filter) => {
          const userJson = user.toJSON();
          const fieldValue = userJson[filter.field as keyof typeof userJson];

          if (filter.operator === "equals") {
            return fieldValue === filter.value;
          }
          return true;
        });
      });
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const data = filteredUsers.slice(start, end);

    return new PaginatedResult(data, {
      limit,
      page,
      total: filteredUsers.length,
      totalPages: Math.ceil(filteredUsers.length / limit),
      hasNext: filteredUsers.length > end,
      hasPrevious: page > 1,
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id.value === id) ?? null;
  }

  async save(entity: User): Promise<void> {}
  async delete(entity: User): Promise<void> {}
  async count(criteria?: Criteria<User>): Promise<number> {
    return this.users.length;
  }
  async exists(id: string): Promise<boolean> {
    return this.users.some((u) => u.id.value === id);
  }

  protected get toDomainMapper(): any {
    return null;
  }
  protected get toPersistenceMapper(): any {
    return null;
  }
  protected get model(): any {
    return null;
  }
}

function createUser(
  id: string,
  name: string,
  email: string,
  status: "active" | "inactive" = "active"
): User {
  return new User({
    id: Id.from(id),
    name,
    email,
    status,
  });
}

describe("CsvExportService", () => {
  let service: CsvExportService;
  let repository: UserRepository;

  beforeEach(() => {
    service = new CsvExportService();
    const users = [
      createUser("1", "John Doe", "john@example.com", "active"),
      createUser("2", "Jane Smith", "jane@example.com", "active"),
      createUser("3", "Bob Wilson", "bob@example.com", "inactive"),
    ];
    repository = new UserRepository(users);
  });

  describe("export", () => {
    it("should export with default options", async () => {
      const result = await service.export(repository);

      expect(result.csv).toBeTruthy();
      expect(result.csv).toContain("id,name,email,status");
      expect(result.stats.totalRecords).toBe(3);
      expect(result.stats.totalColumns).toBe(4);
    });

    it("should export with selected columns", async () => {
      const result = await service.export(repository, undefined, {
        columns: ["name", "email"],
      });

      expect(result.csv).toContain("name,email");
      expect(result.stats.totalColumns).toBe(2);
    });

    it("should export with custom headers", async () => {
      const result = await service.export(repository, undefined, {
        columns: ["name", "email"],
        headers: {
          name: "Full Name",
          email: "Email Address",
        },
      });

      expect(result.csv).toContain("Full Name,Email Address");
    });

    it("should export with formatters", async () => {
      const result = await service.export(repository, undefined, {
        columns: ["name", "status"],
        formatters: {
          status: (value) => value.toUpperCase(),
        },
      });


      expect(result.csv).toContain("ACTIVE");
      expect(result.csv).toContain("INACTIVE");
    });

    it("should handle empty repository", async () => {
      const emptyRepo = new UserRepository([]);
      const result = await service.export(emptyRepo);

      expect(result.csv).toBeDefined();
      expect(result.stats.totalRecords).toBe(0);
    });

    it("should report statistics", async () => {
      const result = await service.export(repository);

      expect(result.stats).toBeDefined();
      expect(result.stats.totalRecords).toBe(3);
      expect(result.stats.sizeInBytes).toBeGreaterThan(0);
      expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.stats.hasWarnings).toBe(false);
    });

    it("should call progress callback", async () => {
      let progressCalls = 0;

      await service.export(repository, undefined, {}, (processed, total) => {
        progressCalls++;
        expect(processed).toBeLessThanOrEqual(total);
      });

      expect(progressCalls).toBeGreaterThan(0);
    });

    it("should filter with criteria", async () => {
      const criteria = Criteria.create<User>().where(
        "status",
        "equals",
        "active"
      );

      const result = await service.export(repository, criteria, {
        columns: ["name", "status"],
      });

      expect(result.stats.totalRecords).toBe(2);
      expect(result.csv).toContain("John Doe");
      expect(result.csv).not.toContain("Bob Wilson");
    });
  });

  describe("exportStream", () => {
    it("should export to stream", async () => {
      const stream = await service.exportStream(repository);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const csv = Buffer.concat(chunks).toString();

      expect(csv).toContain("id,name,email,status");
      expect(csv).toContain("John Doe");
    });

    it("should export stream with batches", async () => {
      const stream = await service.exportStream(repository, undefined, {
        batchSize: 1,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const csv = Buffer.concat(chunks).toString();
      expect(csv).toBeTruthy();
    });

    it("should handle empty stream", async () => {
      const emptyRepo = new UserRepository([]);
      const stream = await service.exportStream(emptyRepo);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const csv = Buffer.concat(chunks).toString();
      expect(csv).toBeTruthy();
    });
  });

  describe("integration scenarios", () => {
    it("should export large dataset efficiently", async () => {
      // Create large dataset
      const largeUsers = Array.from({ length: 1000 }, (_, i) =>
        createUser(`${i}`, `User ${i}`, `user${i}@example.com`)
      );

      const largeRepo = new UserRepository(largeUsers);

      const result = await service.export(largeRepo, undefined, {
        columns: ["name", "email"],
      });

      expect(result.stats.totalRecords).toBe(1000);
      const lines = result.csv.split("\n");
      expect(lines.length).toBe(1001); // Header + 1000 users
    });

    it("should stream large dataset", async () => {
      const largeUsers = Array.from({ length: 500 }, (_, i) =>
        createUser(`${i}`, `User ${i}`, `user${i}@example.com`)
      );

      const largeRepo = new UserRepository(largeUsers);

      const stream = await service.exportStream(largeRepo, undefined, {
        batchSize: 50,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const csv = Buffer.concat(chunks).toString();
      const lines = csv.split("\n").filter((line) => line.length > 0);
      expect(lines.length).toBe(501); // Header + 500 users
    });
  });
});
