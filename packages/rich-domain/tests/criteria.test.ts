import { Pagination } from "../src";
import { Criteria } from "../src/criteria";
import { PaginatedResult } from "../src/paginated-result";
import { Post } from "./utils";

interface TestUser {
  id: string;
  name: string;
  email: string;
  age: number;
  status: "active" | "inactive";
  createdAt: Date;
}

const testUsers: TestUser[] = [
  {
    id: "1",
    name: "Alice",
    email: "alice@example.com",
    age: 25,
    status: "active",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    name: "Bob",
    email: "bob@example.com",
    age: 30,
    status: "active",
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "3",
    name: "Charlie",
    email: "charlie@test.com",
    age: 35,
    status: "inactive",
    createdAt: new Date("2024-03-01"),
  },
  {
    id: "4",
    name: "Diana",
    email: "diana@example.com",
    age: 28,
    status: "active",
    createdAt: new Date("2024-04-01"),
  },
  {
    id: "5",
    name: "Eve",
    email: "eve@test.com",
    age: 22,
    status: "inactive",
    createdAt: new Date("2024-05-01"),
  },
];

describe("Criteria", () => {
  describe("Fluent API", () => {
    it("should create empty criteria", () => {
      const criteria = Criteria.create<TestUser>();
      expect(criteria.hasFilters()).toBe(false);
      expect(criteria.hasOrders()).toBe(false);
      expect(criteria.hasPagination()).toBe(true); // Default pagination is set
    });

    it("should chain methods fluently", () => {
      const criteria = Criteria.create<TestUser>()
        .where("status", "equals", "active")
        .where("age", "greaterThan", 18)
        .orderBy("name", "asc")
        .paginate(1, 10);

      expect(criteria.hasFilters()).toBe(true);
      expect(criteria.hasOrders()).toBe(true);
      expect(criteria.hasPagination()).toBe(true);
    });

    it("should use shorthand methods", () => {
      const criteria = Criteria.create<TestUser>()
        .whereEquals("status", "active")
        .whereContains("name", "ali")
        .whereIn("age", [25, 30, 35])
        .orderByDesc("createdAt");

      const filters = criteria.getFilters();
      expect(filters).toHaveLength(3);
      expect(filters[0].operator).toBe("equals");
      expect(filters[1].operator).toBe("contains");
      expect(filters[2].operator).toBe("in");
    });
  });

  describe("Filtering", () => {
    it("should filter by equals", () => {
      const criteria = Criteria.create<TestUser>().whereEquals(
        "status",
        "active"
      );
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(3);
      expect(result.data.every((u) => u.status === "active")).toBe(true);
    });

    it("should filter by notEquals", () => {
      const criteria = Criteria.create<TestUser>().where(
        "status",
        "notEquals",
        "active"
      );
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(2);
      expect(result.data.every((u) => u.status === "inactive")).toBe(true);
    });

    it("should filter by greaterThan", () => {
      const criteria = Criteria.create<TestUser>().where(
        "age",
        "greaterThan",
        28
      );
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(2);
      expect(result.data.map((u) => u.name)).toEqual(["Bob", "Charlie"]);
    });

    it("should filter by lessThan", () => {
      const criteria = Criteria.create<TestUser>().where("age", "lessThan", 26);
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(2);
      expect(result.data.map((u) => u.name)).toEqual(["Alice", "Eve"]);
    });

    it("should filter by contains", () => {
      const criteria = Criteria.create<TestUser>().whereContains(
        "email",
        "example"
      );
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(3);
    });

    it("should filter by startsWith", () => {
      const criteria = Criteria.create<TestUser>().where(
        "name",
        "startsWith",
        "A"
      );
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Alice");
    });

    it("should filter by endsWith", () => {
      const criteria = Criteria.create<TestUser>().where(
        "email",
        "endsWith",
        ".com"
      );
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(5);
    });

    it("should filter by in", () => {
      const criteria = Criteria.create<TestUser>().whereIn("age", [25, 35]);
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(2);
      expect(result.data.map((u) => u.name)).toEqual(["Alice", "Charlie"]);
    });

    it("should filter by notIn", () => {
      const criteria = Criteria.create<TestUser>().where(
        "age",
        "notIn",
        [25, 35]
      );
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(3);
    });

    it("should filter by between", () => {
      const criteria = Criteria.create<TestUser>().whereBetween("age", 25, 30);
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(3);
      expect(result.data.map((u) => u.name)).toEqual(["Alice", "Bob", "Diana"]);
    });

    it("should combine multiple filters", () => {
      const criteria = Criteria.create<TestUser>()
        .whereEquals("status", "active")
        .where("age", "greaterThan", 25);

      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(2);
      expect(result.data.map((u) => u.name)).toEqual(["Bob", "Diana"]);
    });
  });

  describe("Ordering", () => {
    it("should order by ascending", () => {
      const criteria = Criteria.create<TestUser>().orderByAsc("age");
      const result = PaginatedResult.fromArray(testUsers, criteria);
      const ages = result.data.map((u) => u.age);
      expect(ages).toEqual([22, 25, 28, 30, 35]);
    });

    it("should order by descending", () => {
      const criteria = Criteria.create<TestUser>().orderByDesc("age");
      const result = PaginatedResult.fromArray(testUsers, criteria);
      const ages = result.data.map((u) => u.age);
      expect(ages).toEqual([35, 30, 28, 25, 22]);
    });

    it("should order by string field", () => {
      const criteria = Criteria.create<TestUser>().orderByAsc("name");
      const result = PaginatedResult.fromArray(testUsers, criteria);
      const names = result.data.map((u) => u.name);
      expect(names).toEqual(["Alice", "Bob", "Charlie", "Diana", "Eve"]);
    });

    it("should order by date field", () => {
      const criteria = Criteria.create<TestUser>().orderByDesc("createdAt");
      const result = PaginatedResult.fromArray(testUsers, criteria);
      const names = result.data.map((u) => u.name);
      expect(names).toEqual(["Eve", "Diana", "Charlie", "Bob", "Alice"]);
    });
  });

  describe("Pagination", () => {
    it("should paginate results", () => {
      const criteria = Criteria.create<TestUser>().paginate(1, 2);
      const result = PaginatedResult.fromArray(testUsers, criteria);

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.total).toBe(5);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrevious).toBe(false);
    });

    it("should get second page", () => {
      const criteria = Criteria.create<TestUser>().paginate(2, 2);
      const result = PaginatedResult.fromArray(testUsers, criteria);

      expect(result.data).toHaveLength(2);
      expect(result.data.map((u) => u.name)).toEqual(["Charlie", "Diana"]);
      expect(result.meta.page).toBe(2);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrevious).toBe(true);
    });

    it("should get last page", () => {
      const criteria = Criteria.create<TestUser>().paginate(3, 2);
      const result = PaginatedResult.fromArray(testUsers, criteria);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Eve");
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrevious).toBe(true);
    });

    it("should handle empty page", () => {
      const criteria = Criteria.create<TestUser>().paginate(10, 2);
      const result = PaginatedResult.fromArray(testUsers, criteria);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(5);
    });

    it("should apply limit shorthand", () => {
      const criteria = Criteria.create<TestUser>().limit(3);
      const result = PaginatedResult.fromArray(testUsers, criteria);

      expect(result.data).toHaveLength(3);
      expect(result.meta.page).toBe(1);
    });
  });

  describe("Combined Operations", () => {
    it("should filter, order, and paginate", () => {
      const criteria = Criteria.create<TestUser>()
        .whereEquals("status", "active")
        .orderByDesc("age")
        .paginate(1, 2);

      const result = PaginatedResult.fromArray(testUsers, criteria);

      expect(result.data).toHaveLength(2);
      expect(result.data.map((u) => u.name)).toEqual(["Bob", "Diana"]);
      expect(result.meta.total).toBe(3); // Total active users
      expect(result.meta.totalPages).toBe(2);
    });
  });

  describe("Serialization", () => {
    it("should convert to object", () => {
      const criteria = Criteria.create<TestUser>()
        .whereEquals("status", "active")
        .orderByDesc("age")
        .paginate(1, 10);

      const obj = criteria.toJSON();

      expect(obj.filters).toHaveLength(1);
      expect(obj.orders).toHaveLength(1);
      expect(obj.pagination).toBeDefined();
      expect(obj.pagination?.page).toBe(1);
    });

    it("should create from object", () => {
      const criteria = Criteria.fromObject<TestUser>({
        filters: [{ field: "status", operator: "equals", value: "active" }],
        orders: [{ field: "age", direction: "desc" }],
        pagination: { page: 1, limit: 10, offset: 0 },
      });

      expect(criteria.getFilters()).toHaveLength(1);
      expect(criteria.getOrders()).toHaveLength(1);
      expect(criteria.getPagination()?.page).toBe(1);
    });

    it("should clone criteria", () => {
      const original = Criteria.create<TestUser>()
        .whereEquals("status", "active")
        .orderByDesc("age");

      const cloned = original.clone();
      cloned.whereEquals("age", 30);

      expect(original.getFilters()).toHaveLength(1);
      expect(cloned.getFilters()).toHaveLength(2);
    });

    it("should deserialize pagination result with entities", () => {
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };

      const data = [
        new Post({
          title: "Post 1",
          content: "Content 1",
          likes: 1,
        }),
        new Post({
          title: "Post 2",
          content: "Content 2",
          likes: 2,
        }),
      ];

      const total = data.length;

      const paginationResult = PaginatedResult.create(data, pagination, total);

      const result = paginationResult.toJSON();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].title).toBe("Post 1");
      expect(result.data[1].title).toBe("Post 2");
      expect(result.meta.total).toBe(total);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it("should deserialize pagination result with plain objects", () => {
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
      const total = testUsers.length;

      const paginationResult = PaginatedResult.create(
        testUsers,
        pagination,
        total
      );

      const result = paginationResult.toJSON();

      expect(result.data).toHaveLength(testUsers.length);
      expect(result.data.map((u) => u.name)).toEqual(
        testUsers.map((u) => u.name)
      );
      expect(result.meta.total).toBe(total);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe("Helper Functions", () => {
    it("should create pagination meta", () => {
      const pagination = { page: 2, limit: 10, offset: 10 };
      const meta = PaginatedResult.createMeta(pagination, 45);

      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(10);
      expect(meta.total).toBe(45);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrevious).toBe(true);
    });

    it("should create paginated result", () => {
      const data = [{ id: "1" }, { id: "2" }];
      const pagination = { page: 1, limit: 2, offset: 0 };
      const result = PaginatedResult.create(data, pagination, data.length);

      expect(result.data).toEqual(data);
      expect(result.meta.total).toBe(data.length);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe("Criteria from Query Params", () => {
    it("should create criteria from query params", () => {
      const queryParams = {
        "status:equals": "active",
        "age:greaterThan": "25",
        orderBy: "age",
        orderDirection: "desc",
        page: "1",
        limit: "2",
      };

      const criteria = Criteria.fromQueryParams<TestUser>(queryParams);
      expect(criteria.getFilters()).toHaveLength(2);
      expect(criteria.getOrders()).toHaveLength(1);
      expect(criteria.getPagination()?.page).toBe(1);
      expect(criteria.getPagination()?.limit).toBe(2);
    });
  });
});
