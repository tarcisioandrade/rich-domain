import { Entity } from "./entity.js";
import { ValueObject } from "./value-object.js";
import { Id } from "./id.js";
import { ConfigurationError } from "./exceptions.js";
import { levenshteinDistance } from "./utils/helpers.js";

/**
 * Type of collection relationship.
 * - 'owned': Parent owns the children (1:N). Delete parent = delete children.
 * - 'reference': Parent references existing entities (N:N). Delete parent = unlink only.
 */
export type CollectionType = "owned" | "reference";

/**
 * Configuration for a collection (1:N or N:N relationship).
 */
export interface CollectionConfig {
  /**
   * Type of relationship.
   * - 'owned': Children are created/deleted with the parent (default for 1:N)
   * - 'reference': Only the link is created/removed (for N:N)
   * @default 'owned'
   */
  type: CollectionType;

  /**
   * Target entity name (required for 'reference' type).
   * @example 'Tag'
   */
  entity?: string;

  /**
   * Junction table configuration (optional, for ORMs that need it like Drizzle).
   * Prisma handles this automatically, so it's optional.
   */
  junction?: {
    /** Junction table name (e.g., 'post_tags', '_PostToTag') */
    table: string;
    /** FK field pointing to the source entity (e.g., 'post_id') */
    sourceKey: string;
    /** FK field pointing to the target entity (e.g., 'tag_id') */
    targetKey: string;
  };
}

/**
 * Mapping schema for a domain entity.
 */
export interface EntitySchema {
  /** Entity name in the domain (e.g., 'User', 'Post') */
  entity: string;
  /** Table name in the database (e.g., 'users', 'blog_posts') */
  table: string;
  /**
   * Field mapping: domain → database.
   * Only include fields with different names.
   * @example { email: 'user_email', createdAt: 'created_at' }
   */
  fields?: Record<string, string>;
  /**
   * FK configuration for parent relation (1:N owned).
   */
  parentFk?: {
    /** Name of the FK field in the database (e.g., 'author_id') */
    field: string;
    /** Name of the parent entity (e.g., 'User') */
    parentEntity: string;
  };
  /**
   * Collection configurations for this entity's relations.
   * Key is the property name in the domain entity.
   * @example
   * ```typescript
   * collections: {
   *   comments: { type: 'owned' },
   *   tags: { type: 'reference', entity: 'Tag' }
   * }
   * ```
   */
  collections?: Record<string, CollectionConfig>;
}

/**
 * Result of entity mapping.
 */
export interface MappedEntityData {
  [key: string]: any;
}

/**
 * Registry for mapping domain entities to database tables and fields.
 *
 * @example
 * ```typescript
 * const registry = new EntitySchemaRegistry()
 *   .register({
 *     entity: 'User',
 *     table: 'users',
 *     fields: { email: 'user_email', name: 'user_name' },
 *   })
 *   .register({
 *     entity: 'Post',
 *     table: 'blog_posts',
 *     fields: { content: 'post_content' },
 *     parentFk: { field: 'author_id', parentEntity: 'User' },
 *     collections: {
 *       comments: { type: 'owned' },
 *       tags: { type: 'reference', entity: 'Tag' }
 *     }
 *   });
 *
 * const table = registry.getTable('Post'); // 'blog_posts'
 * const tagConfig = registry.getCollectionConfig('Post', 'tags');
 * // { type: 'reference', entity: 'Tag' }
 * ```
 */
export class EntitySchemaRegistry {
  private schemas = new Map<string, EntitySchema>();

  /**
   * Registers an entity schema.
   * @param schema - Schema to be registered.
   * @returns this (for chaining)
   */
  register(schema: EntitySchema): this {
    if (this.schemas.has(schema.entity)) {
      console.warn(
        `EntitySchemaRegistry: Schema for '${schema.entity}' is being overwritten`
      );
    }
    this.schemas.set(schema.entity, schema);
    return this;
  }

  /**
   * Registers multiple schemas at once.
   * @param schemas - Array of schemas.
   * @returns this (for chaining)
   */
  registerAll(schemas: EntitySchema[]): this {
    schemas.forEach((schema) => this.register(schema));
    return this;
  }

  /**
   * Gets the schema of an entity.
   * @param entity - Entity name.
   * @throws Error if the entity is not registered.
   */
  getSchema(entity: string): EntitySchema {
    const schema = this.schemas.get(entity);
    if (!schema) {
      throw new ConfigurationError(
        `EntitySchemaRegistry: No schema registered for entity '${entity}'. ` +
          `Available entities: ${
            Array.from(this.schemas.keys()).join(", ") || "none"
          }`
      );
    }
    return schema;
  }

  /**
   * Gets all registered schemas.
   */
  getAllSchemas(): EntitySchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Tries to get the schema of an entity, returns null if not found.
   * @param entity - Entity name.
   */
  tryGetSchema(entity: string): EntitySchema | null {
    return this.schemas.get(entity) ?? null;
  }

  /**
   * Checks if an entity is registered.
   * @param entity - Entity name.
   */
  has(entity: string): boolean {
    return this.schemas.has(entity);
  }

  /**
   * Gets the table name for an entity.
   * @param entity - Entity name.
   */
  getTable(entity: string): string {
    return this.getSchema(entity).table;
  }

  /**
   * Gets the field mapping for an entity.
   * @param entity - Entity name.
   */
  getFieldsMap(entity: string): Record<string, string> {
    return this.getSchema(entity).fields || {};
  }

  /**
   * Maps a domain field name to the database field name.
   * @param entity - Entity name.
   * @param fieldName - Domain field name.
   */
  mapFieldName(entity: string, fieldName: string): string {
    const fields = this.getFieldsMap(entity);
    return fields[fieldName] ?? fieldName;
  }

  /**
   * Maps fields of a domain object to database field names.
   * Ignores values that are Entity, ValueObject, or Arrays.
   *
   * @param entity - Entity name.
   * @param data - Data to be mapped.
   */
  mapFields(entity: string, data: Record<string, any>): MappedEntityData {
    const fields = this.getFieldsMap(entity);
    const result: MappedEntityData = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.isEntityOrCollection(value)) continue;
      const mappedKey = fields[key] ?? key;
      result[mappedKey] = this.normalizeValue(value);
    }
    return result;
  }

  /**
   * Maps a complete domain entity to database data.
   * Used for CREATE operations.
   *
   * @param entity - Entity name.
   * @param domainEntity - Domain entity instance.
   */
  mapEntity(
    entity: string,
    domainEntity: Entity<any> | ValueObject<any>
  ): MappedEntityData {
    const fields = this.getFieldsMap(entity);
    const result: MappedEntityData = {};
    const hasId = (domainEntity as any).id;
    if (hasId) {
      const idValue = hasId.value ?? hasId;
      result["id"] = idValue;
    }
    const props = (domainEntity as any).props || domainEntity;
    for (const [key, value] of Object.entries(props)) {
      if (key === "id") continue;
      if (this.isEntityOrCollection(value)) continue;
      const mappedKey = fields[key] ?? key;
      result[mappedKey] = this.normalizeValue(value);
    }
    return result;
  }

  /**
   * Gets the FK object to relate with the parent.
   *
   * @param entity - Entity name.
   * @param parentId - Parent ID.
   * @returns Object with the FK field or null if there is no parent.
   */
  getParentFk(entity: string, parentId: string): Record<string, string> | null {
    const schema = this.getSchema(entity);
    if (!schema.parentFk) return null;
    return { [schema.parentFk.field]: parentId };
  }

  /**
   * Gets the name of the parent entity.
   * @param entity - Entity name.
   */
  getParentEntity(entity: string): string | null {
    const schema = this.getSchema(entity);
    return schema.parentFk?.parentEntity ?? null;
  }

  /**
   * Gets the FK field name.
   * @param entity - Entity name.
   */
  getParentFkField(entity: string): string | null {
    const schema = this.getSchema(entity);
    return schema.parentFk?.field ?? null;
  }

  /**
   * Gets the collection configuration for a specific field.
   *
   * @param entity - Parent entity name (e.g., 'Post')
   * @param fieldName - Collection field name (e.g., 'tags')
   * @returns CollectionConfig or null if not configured
   *
   * @example
   * ```typescript
   * const config = registry.getCollectionConfig('Post', 'tags');
   * if (config?.type === 'reference') {
   *   // Handle N:N relation - use connect/disconnect
   * } else {
   *   // Handle 1:N relation - use create/delete
   * }
   * ```
   */
  getCollectionConfig(
    entity: string,
    fieldName: string
  ): CollectionConfig | null {
    const schema = this.tryGetSchema(entity);
    if (!schema?.collections) return null;
    return schema.collections[fieldName] ?? null;
  }

  /**
   * Checks if a collection is a reference type (N:N).
   *
   * @param entity - Parent entity name
   * @param fieldName - Collection field name
   * @returns true if the collection is a reference (N:N), false otherwise
   *
   * @example
   * ```typescript
   * if (registry.isReferenceCollection('Post', 'tags')) {
   *   // Use connect/disconnect instead of create/delete
   * }
   * ```
   */
  isReferenceCollection(entity: string, fieldName: string): boolean {
    const config = this.getCollectionConfig(entity, fieldName);
    return config?.type === "reference";
  }

  /**
   * Checks if a collection is owned (1:N).
   * Returns true if explicitly configured as 'owned' or if not configured at all.
   *
   * @param entity - Parent entity name
   * @param fieldName - Collection field name
   * @returns true if the collection is owned (1:N), false if reference
   */
  isOwnedCollection(entity: string, fieldName: string): boolean {
    const config = this.getCollectionConfig(entity, fieldName);
    // Default to owned if not configured
    return config?.type !== "reference";
  }

  /**
   * Gets all collections configured for an entity.
   *
   * @param entity - Entity name
   * @returns Record of field names to collection configs, or empty object
   */
  getCollections(entity: string): Record<string, CollectionConfig> {
    const schema = this.tryGetSchema(entity);
    return schema?.collections ?? {};
  }

  /**
   * Gets all reference (N:N) collections for an entity.
   *
   * @param entity - Entity name
   * @returns Array of field names that are reference collections
   */
  getReferenceCollections(entity: string): string[] {
    const collections = this.getCollections(entity);
    return Object.entries(collections)
      .filter(([_, config]) => config.type === "reference")
      .map(([field]) => field);
  }

  /**
   * Gets the junction table configuration for a reference collection.
   *
   * @param entity - Parent entity name
   * @param fieldName - Collection field name
   * @returns Junction config or null
   */
  getJunctionConfig(
    entity: string,
    fieldName: string
  ): CollectionConfig["junction"] | null {
    const config = this.getCollectionConfig(entity, fieldName);
    return config?.junction ?? null;
  }

  /**
   * Lists all registered entities.
   */
  getRegisteredEntities(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Clears all registered schemas.
   */
  clear(): void {
    this.schemas.clear();
  }

  /**
   * Checks if a value is Entity, ValueObject, or Array.
   */
  private isEntityOrCollection(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return true;
    if (value instanceof Entity) return true;
    if (value instanceof ValueObject) return true;
    if (
      typeof value === "object" &&
      value.id &&
      typeof value.id === "object" &&
      "value" in value.id
    ) {
      return true;
    }
    return false;
  }

  /**
   * Normalizes a value for persistence.
   */
  private normalizeValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (value instanceof Id) return value.value;
    if (value instanceof Date) return value;
    if (typeof value === "object" && "value" in value) {
      return value.value;
    }
    return value;
  }

  /**
   * Validates that a relation field exists in the entity's collections.
   *
   * @param entity - Parent entity name
   * @param relationField - Relation field to validate
   * @throws ConfigurationError if the field doesn't exist
   *
   */
  public validateRelationField(entity: string, relationField: string): void {
    const schema = this.tryGetSchema(entity);

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidPattern.test(entity)) {
      throw new ConfigurationError(
        `EntitySchemaRegistry: Received an ID '${entity}' instead of an entity name. ` +
          `This usually means 'parentEntity' is not being set correctly in the ChangeTracker. ` +
          `Check that addDelete/addCreate are receiving the entity NAME (e.g., 'Post'), not the ID.`
      );
    }

    if (!schema) {
      throw new ConfigurationError(
        `EntitySchemaRegistry: Cannot validate relation '${relationField}' - ` +
          `entity '${entity}' is not registered. ` +
          `Available entities: ${
            this.getRegisteredEntities().join(", ") || "none"
          }`
      );
    }

    const collections = schema.collections ?? {};
    const availableCollections = Object.keys(collections);

    if (availableCollections.length === 0) {
      return;
    }

    if (!collections[relationField]) {
      const suggestions = this.findSimilarNames(
        relationField,
        availableCollections
      );
      const suggestionText =
        suggestions.length > 0
          ? ` Did you mean: '${suggestions.join("' or '")}'?`
          : "";

      throw new ConfigurationError(
        `EntitySchemaRegistry: Unknown relation '${relationField}' for entity '${entity}'. ` +
          `Available collections: ${availableCollections.join(
            ", "
          )}.${suggestionText}`
      );
    }
  }

  private findSimilarNames(input: string, candidates: string[]): string[] {
    return candidates
      .map((candidate) => ({
        name: candidate,
        distance: levenshteinDistance(
          input.toLowerCase(),
          candidate.toLowerCase()
        ),
      }))
      .filter(({ distance }) => distance <= 3)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .map(({ name }) => name);
  }
}
