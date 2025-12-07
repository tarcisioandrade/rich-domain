import { describe, it, expect } from "vitest";
import {
  prismaTypeToTs,
  prismaTypeToZod,
  toKebabCase,
  toCamelCase,
  isTimestampField,
  isCreateField,
  isForeignKey,
  type PrismaField,
  type PrismaModel,
} from "../src/commands/generate/prisma-parser.js";

describe("prisma-parser", () => {
  describe("prismaTypeToTs", () => {
    it("should convert String to string", () => {
      const field: PrismaField = {
        name: "name",
        type: "String",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToTs(field)).toBe("string");
    });

    it("should convert Int to number", () => {
      const field: PrismaField = {
        name: "age",
        type: "Int",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToTs(field)).toBe("number");
    });

    it("should handle nullable fields", () => {
      const field: PrismaField = {
        name: "bio",
        type: "String",
        kind: "scalar",
        isList: false,
        isRequired: false,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToTs(field)).toBe("string | null");
    });

    it("should handle list fields", () => {
      const field: PrismaField = {
        name: "tags",
        type: "String",
        kind: "scalar",
        isList: true,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToTs(field)).toBe("string[]");
    });

    it("should handle enum fields", () => {
      const field: PrismaField = {
        name: "role",
        type: "Role",
        kind: "enum",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToTs(field)).toBe("Role");
    });

    it("should handle DateTime", () => {
      const field: PrismaField = {
        name: "createdAt",
        type: "DateTime",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToTs(field)).toBe("Date");
    });
  });

  describe("prismaTypeToZod", () => {
    it("should convert String to z.string()", () => {
      const field: PrismaField = {
        name: "name",
        type: "String",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToZod(field)).toBe("z.string()");
    });

    it("should add email validation for email field", () => {
      const field: PrismaField = {
        name: "email",
        type: "String",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: true,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToZod(field)).toBe("z.string().email()");
    });

    it("should add min(8) validation for password field", () => {
      const field: PrismaField = {
        name: "password",
        type: "String",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToZod(field)).toBe("z.string().min(8)");
    });

    it("should handle nullable fields", () => {
      const field: PrismaField = {
        name: "bio",
        type: "String",
        kind: "scalar",
        isList: false,
        isRequired: false,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToZod(field)).toBe("z.string().nullable()");
    });

    it("should handle arrays", () => {
      const field: PrismaField = {
        name: "tags",
        type: "String",
        kind: "scalar",
        isList: true,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(prismaTypeToZod(field)).toBe("z.array(z.string())");
    });

    it("should handle relations with instanceof", () => {
      const field: PrismaField = {
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
      };

      expect(prismaTypeToZod(field)).toBe("z.instanceof(User)");
    });

    it("should handle list relations", () => {
      const field: PrismaField = {
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
      };

      expect(prismaTypeToZod(field)).toBe("z.array(z.instanceof(Post))");
    });
  });

  describe("toKebabCase", () => {
    it("should convert PascalCase to kebab-case", () => {
      expect(toKebabCase("UserProfile")).toBe("user-profile");
      expect(toKebabCase("User")).toBe("user");
      expect(toKebabCase("BlogPostComment")).toBe("blog-post-comment");
    });
  });

  describe("toCamelCase", () => {
    it("should convert PascalCase to camelCase", () => {
      expect(toCamelCase("UserProfile")).toBe("userProfile");
      expect(toCamelCase("User")).toBe("user");
    });
  });

  describe("isTimestampField", () => {
    it("should identify createdAt as timestamp", () => {
      const field: PrismaField = {
        name: "createdAt",
        type: "DateTime",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: true,
      };

      expect(isTimestampField(field)).toBe(true);
    });

    it("should identify updatedAt as timestamp", () => {
      const field: PrismaField = {
        name: "updatedAt",
        type: "DateTime",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: true,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(isTimestampField(field)).toBe(true);
    });

    it("should not identify regular DateTime as timestamp", () => {
      const field: PrismaField = {
        name: "publishedAt",
        type: "DateTime",
        kind: "scalar",
        isList: false,
        isRequired: false,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(isTimestampField(field)).toBe(false);
    });
  });

  describe("isCreateField", () => {
    it("should exclude id fields", () => {
      const field: PrismaField = {
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
      };

      expect(isCreateField(field)).toBe(false);
    });

    it("should exclude timestamp fields", () => {
      const field: PrismaField = {
        name: "createdAt",
        type: "DateTime",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: true,
      };

      expect(isCreateField(field)).toBe(false);
    });

    it("should exclude relation fields", () => {
      const field: PrismaField = {
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
      };

      expect(isCreateField(field)).toBe(false);
    });

    it("should include regular fields", () => {
      const field: PrismaField = {
        name: "title",
        type: "String",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      expect(isCreateField(field)).toBe(true);
    });
  });

  describe("isForeignKey", () => {
    it("should identify foreign key fields", () => {
      const field: PrismaField = {
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
      };

      const model: PrismaModel = {
        name: "Post",
        primaryKey: null,
        uniqueFields: [],
        fields: [
          field,
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
      };

      expect(isForeignKey(field, model)).toBe(true);
    });

    it("should not identify non-FK fields ending in Id", () => {
      const field: PrismaField = {
        name: "externalId",
        type: "String",
        kind: "scalar",
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isUpdatedAt: false,
        isGenerated: false,
        hasDefaultValue: false,
      };

      const model: PrismaModel = {
        name: "Post",
        primaryKey: null,
        uniqueFields: [],
        fields: [field],
      };

      expect(isForeignKey(field, model)).toBe(false);
    });
  });
});
