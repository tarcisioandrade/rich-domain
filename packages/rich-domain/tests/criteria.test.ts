import { Pagination } from "../src";
import { Criteria } from "../src/criteria";
import { PaginatedResult } from "../src/paginated-result";
import { CriteriaAdapter } from "../src/types";
import { Post } from "./utils";

interface TestUser {
  id: string;
  name: string;
  email: string;
  age: number;
  status: "active" | "inactive";
  createdAt: Date;
}

interface UserWithPostsDto {
  id: string;
  name: string;
  posts: { title: string; content: string }[];
  leads: {
    contact: {
      name: string;
    };
  }[];
}

interface UserWithNestedObject {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    country: string;
  };
  tags: string[];
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
      expect(criteria.hasPagination()).toBe(true);
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
    it("should filter by search", () => {
      const criteria = Criteria.create<TestUser>().search(["name"], "Bob");

      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Bob");
    });

    it("should search by all items ignoring pagination and limit", () => {
      const criteria = Criteria.create<TestUser>()
        .search(["name"], "Eve")
        .paginate(3, 1);
      const result = PaginatedResult.fromArray(testUsers, criteria);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Eve");
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(1);
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

    it("should filter, order, and paginate", () => {
      const criteria = Criteria.create<TestUser>()
        .whereEquals("status", "active")
        .orderByDesc("age")
        .paginate(1, 2);

      const result = PaginatedResult.fromArray(testUsers, criteria);

      expect(result.data).toHaveLength(2);
      expect(result.data.map((u) => u.name)).toEqual(["Bob", "Diana"]);
      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(2);
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

    it("should apply limit shorthand", () => {
      const criteria = Criteria.create<TestUser>().limit(3);
      const result = PaginatedResult.fromArray(testUsers, criteria);

      expect(result.data).toHaveLength(3);
      expect(result.meta.page).toBe(1);
    });

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
          published: true,
          comments: [],
        }),
        new Post({
          title: "Post 2",
          content: "Content 2",
          published: true,
          comments: [],
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

  describe("Criteria from Query Params", () => {
    it("should create criteria from query params", () => {
      const queryParams = {
        filters: {
          "status:equals": "active",
          "age:greaterThan": "25",
        },
        orderBy: "age:desc",
        page: "1",
        limit: "2",
      };

      const criteria = Criteria.fromQueryParams<TestUser>(queryParams);
      expect(criteria.getFilters()).toHaveLength(2);
      expect(criteria.getOrders()[0].field).toBe("age");
      expect(criteria.getOrders()[0].direction).toBe("desc");
      expect(criteria.getPagination()?.page).toBe(1);
      expect(criteria.getPagination()?.limit).toBe(2);
    });

    it("should support legacy orderBy format (orderBy + orderDirection)", () => {
      const queryParams = {
        orderBy: "name",
        orderDirection: "desc",
      };

      const criteria = Criteria.fromQueryParams<TestUser>(queryParams);
      const orders = criteria.getOrders();

      expect(orders).toHaveLength(1);
      expect(orders[0].field).toBe("name");
      expect(orders[0].direction).toBe("desc");
    });

    it("should support comma-separated orderBy format with multiple fields", () => {
      const queryParams = {
        orderBy: "name:asc,email:desc,age:asc",
      };

      const criteria = Criteria.fromQueryParams<TestUser>(queryParams);
      const orders = criteria.getOrders();

      expect(orders).toHaveLength(3);
      expect(orders[0].field).toBe("name");
      expect(orders[0].direction).toBe("asc");
      expect(orders[1].field).toBe("email");
      expect(orders[1].direction).toBe("desc");
      expect(orders[2].field).toBe("age");
      expect(orders[2].direction).toBe("asc");
    });

    it("should support JSON array orderBy format", () => {
      const queryParams = {
        orderBy: '["name:desc","email:asc"]',
      };

      const criteria = Criteria.fromQueryParams<TestUser>(queryParams);
      const orders = criteria.getOrders();

      expect(orders).toHaveLength(2);
      expect(orders[0].field).toBe("name");
      expect(orders[0].direction).toBe("desc");
      expect(orders[1].field).toBe("email");
      expect(orders[1].direction).toBe("asc");
    });
  });

  describe("Quantifiers", () => {
    describe("Fluent API methods", () => {
      it("should use quantifiers horthand methods", () => {
        // CHECK: Devemos permitir o encadeamento de metodos quantifiers?
        const criteria = Criteria.create<TestUser>()
          .whereSome("name", "contains", "ali")
          .whereEvery("name", "contains", "ali")
          .whereNone("name", "contains", "ali");

        const filters = criteria.getFilters().map((f) => f.options?.quantifier);

        expect(filters).toHaveLength(3);
        expect(filters).toEqual(["some", "every", "none"]);
      });

      it("should create filter with whereSome", () => {
        const criteria = Criteria.create<UserWithPostsDto>().whereSome(
          "posts.title",
          "contains",
          "test"
        );

        const filters = criteria.getFilters();

        expect(filters).toHaveLength(1);
        expect(filters[0].field).toBe("posts.title");
        expect(filters[0].operator).toBe("contains");
        expect(filters[0].value).toBe("test");
        expect(filters[0].options?.quantifier).toBe("some");
      });

      it("should create filter with whereEvery", () => {
        const criteria = Criteria.create<UserWithPostsDto>().whereEvery(
          "posts.title",
          "contains",
          "test"
        );

        const filters = criteria.getFilters();
        expect(filters).toHaveLength(1);
        expect(filters[0].options?.quantifier).toBe("every");
      });

      it("should create filter with whereNone", () => {
        const criteria = Criteria.create<UserWithPostsDto>().whereNone(
          "posts.title",
          "contains",
          "test"
        );

        const filters = criteria.getFilters();
        expect(filters).toHaveLength(1);
        expect(filters[0].options?.quantifier).toBe("none");
      });

      it("should parse quantifier from query params with @some", () => {
        const queryParams = {
          filters: {
            "posts.title:contains@some": "test",
          },
        };

        const criteria =
          Criteria.fromQueryParams<UserWithPostsDto>(queryParams);
        const filters = criteria.getFilters();

        expect(filters).toHaveLength(1);
        expect(filters[0].field).toBe("posts.title");
        expect(filters[0].operator).toBe("contains");
        expect(filters[0].value).toBe("test");
        expect(filters[0].options?.quantifier).toBe("some");
      });

      it("should work with in operator and quantifier", () => {
        const queryParams = {
          filters: {
            "posts.title:in@some": ["test1", "test2", "test3"],
          },
        };

        const criteria =
          Criteria.fromQueryParams<UserWithPostsDto>(queryParams);
        const filters = criteria.getFilters();

        expect(filters).toHaveLength(1);
        expect(filters[0].operator).toBe("in");
        expect(filters[0].value).toEqual(["test1", "test2", "test3"]);
        expect(filters[0].options?.quantifier).toBe("some");
      });

      it("should work with object stringified in query params", () => {
        const queryParams = {
          filters: {
            "posts.title:in@some": JSON.stringify(["test1", "test2", "test3"]),
          },
        };

        const criteria =
          Criteria.fromQueryParams<UserWithPostsDto>(queryParams);
        const filters = criteria.getFilters();

        expect(filters).toHaveLength(1);
        expect(filters[0].operator).toBe("in");
        expect(filters[0].value).toEqual(["test1", "test2", "test3"]);
        expect(filters[0].options?.quantifier).toBe("some");
      });

      it("should work with between operator and quantifier", () => {
        const queryParams = {
          filters: {
            "posts.likes:between@some": ["10", "100"],
          },
        };

        const criteria =
          Criteria.fromQueryParams<UserWithPostsDto>(queryParams);
        const filters = criteria.getFilters();

        expect(filters).toHaveLength(1);
        expect(filters[0].operator).toBe("between");
        expect(filters[0].value).toEqual([10, 100]);
        expect(filters[0].options?.quantifier).toBe("some");
      });

      it("should throw error for invalid quantifier", () => {
        const queryParams = {
          filters: {
            "posts.title:contains@invalid": "test",
          },
        };

        expect(() => {
          Criteria.fromQueryParams<UserWithPostsDto>(queryParams);
        }).toThrow("Invalid quantifier");
      });

      it("should handle multiple filters with mixed quantifiers", () => {
        const queryParams = {
          filters: {
            "posts.title:contains@some": "test",
            "posts.content:equals@every": "content",
            "name:contains": "John",
          },
        };

        const criteria =
          Criteria.fromQueryParams<UserWithPostsDto>(queryParams);
        const filters = criteria.getFilters();

        expect(filters).toHaveLength(3);
        expect(filters[0].options?.quantifier).toBe("some");
        expect(filters[1].options?.quantifier).toBe("every");
        expect(filters[2].options).toBeUndefined();
      });
    });

    describe("fromObject with quantifier", () => {
      it("should create criteria from object with quantifier", () => {
        const criteria = Criteria.fromObject<UserWithPostsDto>({
          filters: [
            {
              field: "posts.title",
              operator: "contains",
              value: "test",
              options: { quantifier: "some" },
            },
          ],
        });

        const filters = criteria.getFilters();
        expect(filters).toHaveLength(1);
        expect(filters[0].options?.quantifier).toBe("some");
      });

      it("should preserve quantifier when cloning", () => {
        const original = Criteria.create<UserWithPostsDto>().whereSome(
          "posts.title",
          "contains",
          "test"
        );

        const cloned = original.clone();
        const filters = cloned.getFilters();

        expect(filters).toHaveLength(1);
        expect(filters[0].options?.quantifier).toBe("some");
      });
    });

    describe("toJSON with quantifier", () => {
      it("should serialize quantifier to JSON", () => {
        const criteria = Criteria.create<UserWithPostsDto>()
          .whereSome("posts.title", "contains", "test")
          .whereEvery("posts.content", "equals", "content");

        const json = criteria.toJSON();

        expect(json.filters).toHaveLength(2);
        expect(json.filters[0].options?.quantifier).toBe("some");
        expect(json.filters[1].options?.quantifier).toBe("every");
      });
    });
  });

  describe("Adapter", () => {
    type UserInDatabase = {
      id: string;
      name: string;
      user_posts: { title: string; content: string }[];
      leads: {
        contact: {
          fullName: string;
        };
      };
    };
    const UserWithPostsAdapter: CriteriaAdapter<
      UserWithPostsDto,
      UserInDatabase
    > = {
      posts: "user_posts",
      "leads.contact.name": "leads.contact.fullName",
    };

    let criteria: Criteria<UserWithPostsDto>;
    beforeEach(() => {
      criteria =
        Criteria.create<UserWithPostsDto>().useAdapter(UserWithPostsAdapter);
    });

    it("should resolve field path", () => {
      const filters = criteria
        .where("leads.contact.name", "contains", "John")
        .getFilters();

      expect(filters[0].field).toBe("leads.contact.fullName");
    });

    it("should resolve field path from query params", () => {
      const queryParams = {
        filters: {
          "posts:contains": "test",
        },
      };

      const result = Criteria.fromQueryParams<UserWithPostsDto>(
        queryParams,
        UserWithPostsAdapter
      );
      const filters = result.getFilters();

      expect(filters).toHaveLength(1);
      expect(filters[0].field).toBe("user_posts");
      expect(filters[0].operator).toBe("contains");
      expect(filters[0].value).toBe("test");
    });

    it("should resolve field path from object", () => {
      const criteria = Criteria.fromObject<UserWithPostsDto>(
        {
          filters: [
            {
              field: "posts",
              operator: "in",
              value: [{ title: "test" }] as any,
            },
          ],
        },
        UserWithPostsAdapter
      );
      const filters = criteria.getFilters();
      expect(filters).toHaveLength(1);
      expect(filters[0].field).toBe("user_posts");
    });

    it("should only allow nested paths in fromObject for object fields", () => {
      // Only nested paths should work for object fields
      const criteria = Criteria.fromObject<UserWithNestedObject>({
        filters: [
          {
            field: "address.street",
            operator: "equals",
            value: "123 Main St",
          },
          {
            field: "address.city",
            operator: "equals",
            value: "New York",
          },
          {
            field: "id",
            operator: "equals",
            value: "user-1",
          },
        ],
      });

      expect(criteria.getFilters()).toHaveLength(3);
    });
  });

  describe("Nested Object Field Paths", () => {
    it("should only allow nested paths for object fields, not the root", () => {
      const criteria = Criteria.create<UserWithNestedObject>();

      // These should work - nested paths
      criteria.whereEquals("address.city", "123 Main St");
      criteria.whereEquals("address.city", "New York");
      criteria.whereEquals("address.country", "USA");

      // These should work - primitives and arrays
      criteria.whereEquals("id", "user-1");
      criteria.whereEquals("name", "John Doe");
      criteria.where("tags", "in", ["tag1", "tag2"]);

      const filters = criteria.getFilters();
      expect(filters).toHaveLength(6);
    });

    it("should work with array of objects (keeps root + nested)", () => {
      const criteria = Criteria.create<UserWithPostsDto>();

      // These should work - array root and nested paths
      criteria.where("posts", "in", []);
      criteria.whereEquals("posts.title", "Test Post");
      criteria.whereEquals("posts.content", "Test Content");

      const filters = criteria.getFilters();
      expect(filters).toHaveLength(3);
    });
  });
});
