import { describe, it, expect } from "vitest";
import {
  analyzeDependencies,
  getGenerationOrder,
} from "../src/commands/generate/dependency-graph.js";
import type { PrismaModel } from "../src/commands/generate/prisma-parser.js";

describe("dependency-graph", () => {
  describe("analyzeDependencies", () => {
    it("should identify models with no dependencies", () => {
      const models: PrismaModel[] = [
        {
          name: "Tag",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "name",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
          ],
        },
      ];

      const analysis = analyzeDependencies(models);

      expect(analysis.nodes.get("Tag")?.dependencies).toHaveLength(0);
    });

    it("should identify dependencies correctly", () => {
      const models: PrismaModel[] = [
        {
          name: "User",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "posts",
              type: "Post",
              kind: "object",
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
          ],
        },
        {
          name: "Post",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "authorId",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
            {
              name: "author",
              type: "User",
              kind: "object",
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
              relationFromFields: ["authorId"],
              relationToFields: ["id"],
            },
          ],
        },
      ];

      const analysis = analyzeDependencies(models);

      expect(analysis.nodes.get("User")?.dependencies).toContain("Post");
      expect(analysis.nodes.get("Post")?.dependencies).toContain("User");
    });

    it("should classify aggregates and entities correctly", () => {
      const models: PrismaModel[] = [
        {
          name: "User",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "posts",
              type: "Post",
              kind: "object",
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
          ],
        },
        {
          name: "Post",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "authorId",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
            {
              name: "author",
              type: "User",
              kind: "object",
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
              relationFromFields: ["authorId"],
              relationToFields: ["id"],
            },
          ],
        },
      ];

      const analysis = analyzeDependencies(models);

      // User has list relations (posts) -> Aggregate
      expect(analysis.nodes.get("User")?.isAggregate).toBe(true);
      expect(analysis.aggregates).toContain("User");
    });

    it("should detect circular dependencies", () => {
      const models: PrismaModel[] = [
        {
          name: "A",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "b",
              type: "B",
              kind: "object",
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
          ],
        },
        {
          name: "B",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "a",
              type: "A",
              kind: "object",
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
          ],
        },
      ];

      const analysis = analyzeDependencies(models);

      expect(analysis.hasCycles).toBe(true);
    });

    it("should not report cycles when there are none", () => {
      const models: PrismaModel[] = [
        {
          name: "Tag",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
          ],
        },
        {
          name: "Post",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "tags",
              type: "Tag",
              kind: "object",
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
          ],
        },
      ];

      const analysis = analyzeDependencies(models);

      expect(analysis.hasCycles).toBe(false);
    });
  });

  describe("getGenerationOrder", () => {
    it("should return models in topological order", () => {
      const models: PrismaModel[] = [
        {
          name: "User",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "posts",
              type: "Post",
              kind: "object",
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
          ],
        },
        {
          name: "Comment",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
          ],
        },
        {
          name: "Post",
          primaryKey: null,
          uniqueFields: [],
          fields: [
            {
              name: "id",
              type: "String",
              kind: "scalar",
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: true,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: true,
            },
            {
              name: "comments",
              type: "Comment",
              kind: "object",
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              isUpdatedAt: false,
              isGenerated: false,
              hasDefaultValue: false,
            },
          ],
        },
      ];

      const analysis = analyzeDependencies(models);
      const order = getGenerationOrder(analysis);
      const orderNames = order.map((m) => m.name);

      // Comment should come before Post (Post depends on Comment)
      expect(orderNames.indexOf("Comment")).toBeLessThan(
        orderNames.indexOf("Post")
      );
    });
  });
});
