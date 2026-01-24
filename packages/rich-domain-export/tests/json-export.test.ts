import { describe, it, expect, beforeEach } from "vitest";
import { ExportService } from "../src/services/export-service.js";
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
  age: number;
  active: boolean;
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
  age: number,
  active: boolean = true
): User {
  return new User({
    id: Id.from(id),
    name,
    email,
    age,
    active,
  });
}

describe("ExportService - JSON Format", () => {
  let service: ExportService;
  let repository: UserRepository;

  beforeEach(() => {
    service = new ExportService();
    const users = [
      createUser("1", "John Doe", "john@example.com", 30, true),
      createUser("2", "Jane Smith", "jane@example.com", 25, true),
      createUser("3", "Bob Wilson", "bob@example.com", 35, false),
    ];
    repository = new UserRepository(users);
  });

  describe("export - standard JSON", () => {
    it("should export with default options", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
      });

      const data = JSON.parse(result.data as string);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(3);
      expect(data[0]).toHaveProperty("name", "John Doe");
      expect(result.stats.totalRecords).toBe(3);
    });

    it("should export with selected fields", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
        fields: ["name", "email"],
      });

      const data = JSON.parse(result.data as string);
      expect(data[0]).toHaveProperty("name");
      expect(data[0]).toHaveProperty("email");
      expect(data[0]).not.toHaveProperty("age");
      expect(data[0]).not.toHaveProperty("active");
    });

    it("should export with pretty printing", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
        pretty: true,
        indent: 2,
      });

      const jsonString = result.data as string;
      expect(jsonString).toContain("\n");
      expect(jsonString).toContain("  "); // Indentation

      const data = JSON.parse(jsonString);
      expect(data).toHaveLength(3);
    });

    it("should export with custom indent", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
        pretty: true,
        indent: 4,
      });

      const jsonString = result.data as string;
      expect(jsonString).toContain("    "); // 4 spaces indentation
    });

    it("should export with root key", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
        rootKey: "users",
      });

      const data = JSON.parse(result.data as string);
      expect(data).toHaveProperty("users");
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users).toHaveLength(3);
    });

    it("should export with transformers", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
        fields: ["name", "email"],
        transformers: {
          email: (email) => email.toUpperCase(),
        },
      });

      const data = JSON.parse(result.data as string);
      expect(data[0].email).toBe("JOHN@EXAMPLE.COM");
      expect(data[1].email).toBe("JANE@EXAMPLE.COM");
    });

    it("should handle empty repository", async () => {
      const emptyRepo = new UserRepository([]);
      const result = await service.export(emptyRepo, undefined, {
        format: "json",
      });

      const data = JSON.parse(result.data as string);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
      expect(result.stats.totalRecords).toBe(0);
    });

    it("should report statistics", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
      });

      expect(result.stats).toBeDefined();
      expect(result.stats.totalRecords).toBe(3);
      expect(result.stats.sizeInBytes).toBeGreaterThan(0);
      expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.stats.hasWarnings).toBe(false);
      expect(result.stats.format).toBe("json");
    });

    it("should call progress callback", async () => {
      let progressCalls = 0;

      await service.export(
        repository,
        undefined,
        { format: "json" },
        (processed, total) => {
          progressCalls++;
          expect(processed).toBeLessThanOrEqual(total);
        }
      );

      expect(progressCalls).toBeGreaterThan(0);
    });

    it("should filter with criteria", async () => {
      const criteria = Criteria.create<User>().where("active", "equals", true);

      const result = await service.export(repository, criteria, {
        format: "json",
        fields: ["name", "active"],
      });

      const data = JSON.parse(result.data as string);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("John Doe");
      expect(data[1].name).toBe("Jane Smith");
      expect(data.every((u: any) => u.active === true)).toBe(true);
    });
  });

  describe("export - JSON Lines", () => {
    it("should export as JSON Lines", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
        jsonLines: true,
      });

      const lines = (result.data as string).split("\n");
      expect(lines).toHaveLength(3);

      const firstLine = JSON.parse(lines[0]);
      expect(firstLine).toHaveProperty("name", "John Doe");

      const secondLine = JSON.parse(lines[1]);
      expect(secondLine).toHaveProperty("name", "Jane Smith");
    });

    it("should export JSON Lines with selected fields", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
        jsonLines: true,
        fields: ["name", "age"],
      });

      const lines = (result.data as string).split("\n");
      const firstLine = JSON.parse(lines[0]);

      expect(firstLine).toHaveProperty("name");
      expect(firstLine).toHaveProperty("age");
      expect(firstLine).not.toHaveProperty("email");
    });

    it("should export JSON Lines with transformers", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
        jsonLines: true,
        fields: ["name", "age"],
        transformers: {
          age: (age) => age * 2,
        },
      });

      const lines = (result.data as string).split("\n");
      const firstLine = JSON.parse(lines[0]);

      expect(firstLine.age).toBe(60); // 30 * 2
    });
  });

  describe("exportStream", () => {
    it("should export standard JSON to stream", async () => {
      const stream = await service.exportStream(repository, undefined, {
        format: "json",
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const jsonString = Buffer.concat(chunks).toString();
      const data = JSON.parse(jsonString);

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(3);
      expect(data[0]).toHaveProperty("name", "John Doe");
    });

    it("should export pretty JSON to stream", async () => {
      const stream = await service.exportStream(repository, undefined, {
        format: "json",
        pretty: true,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const jsonString = Buffer.concat(chunks).toString();
      expect(jsonString).toContain("\n");

      const data = JSON.parse(jsonString);
      expect(data).toHaveLength(3);
    });

    it("should export JSON Lines to stream", async () => {
      const stream = await service.exportStream(repository, undefined, {
        format: "json",
        jsonLines: true,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const jsonString = Buffer.concat(chunks).toString();
      const lines = jsonString.split("\n").filter((l) => l.length > 0);

      expect(lines).toHaveLength(3);

      lines.forEach((line) => {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty("name");
      });
    });

    it("should export stream with batches", async () => {
      const stream = await service.exportStream(repository, undefined, {
        format: "json",
        batchSize: 1,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const jsonString = Buffer.concat(chunks).toString();
      const data = JSON.parse(jsonString);
      expect(data).toHaveLength(3);
    });

    it("should export JSON Lines stream with batches", async () => {
      const stream = await service.exportStream(repository, undefined, {
        format: "json",
        jsonLines: true,
        batchSize: 1,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const jsonString = Buffer.concat(chunks).toString();
      const lines = jsonString.split("\n").filter((l) => l.length > 0);
      expect(lines).toHaveLength(3);
    });

    it("should handle empty stream", async () => {
      const emptyRepo = new UserRepository([]);
      const stream = await service.exportStream(emptyRepo, undefined, {
        format: "json",
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const jsonString = Buffer.concat(chunks).toString();
      const data = JSON.parse(jsonString);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it("should export with root key in stream", async () => {
      const stream = await service.exportStream(repository, undefined, {
        format: "json",
        rootKey: "users",
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const jsonString = Buffer.concat(chunks).toString();
      const data = JSON.parse(jsonString);

      expect(data).toHaveProperty("users");
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users).toHaveLength(3);
    });
  });

  describe("integration scenarios", () => {
    it("should export large dataset efficiently", async () => {
      const largeUsers = Array.from({ length: 1000 }, (_, i) =>
        createUser(`${i}`, `User ${i}`, `user${i}@example.com`, 20 + i, true)
      );

      const largeRepo = new UserRepository(largeUsers);

      const result = await service.export(largeRepo, undefined, {
        format: "json",
        fields: ["name", "email"],
      });

      const data = JSON.parse(result.data as string);
      expect(data).toHaveLength(1000);
      expect(result.stats.totalRecords).toBe(1000);
    });

    it("should stream large dataset as JSON Lines", async () => {
      const largeUsers = Array.from({ length: 500 }, (_, i) =>
        createUser(`${i}`, `User ${i}`, `user${i}@example.com`, 20 + i, true)
      );

      const largeRepo = new UserRepository(largeUsers);

      const stream = await service.exportStream(largeRepo, undefined, {
        format: "json",
        jsonLines: true,
        batchSize: 50,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const jsonString = Buffer.concat(chunks).toString();
      const lines = jsonString.split("\n").filter((line) => line.length > 0);
      expect(lines).toHaveLength(500);

      // Verify each line is valid JSON
      lines.forEach((line, index) => {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty("name", `User ${index}`);
      });
    });

    it("should stream large dataset as standard JSON", async () => {
      const largeUsers = Array.from({ length: 300 }, (_, i) =>
        createUser(`${i}`, `User ${i}`, `user${i}@example.com`, 20 + i, true)
      );

      const largeRepo = new UserRepository(largeUsers);

      const stream = await service.exportStream(largeRepo, undefined, {
        format: "json",
        batchSize: 50,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const jsonString = Buffer.concat(chunks).toString();
      const data = JSON.parse(jsonString);

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(300);
    });

    it("should handle complex transformations", async () => {
      const result = await service.export(repository, undefined, {
        format: "json",
        fields: ["name", "email", "age", "active"],
        transformers: {
          name: (name) => name.toUpperCase(),
          email: (email) => email.split("@")[0],
          age: (age) => ({
            years: age,
            category: age >= 30 ? "senior" : "junior",
          }),
          active: (active) => (active ? "yes" : "no"),
        },
      });

      const data = JSON.parse(result.data as string);

      expect(data[0].name).toBe("JOHN DOE");
      expect(data[0].email).toBe("john");
      expect(data[0].age).toEqual({ years: 30, category: "senior" });
      expect(data[0].active).toBe("yes");
    });
  });
});
