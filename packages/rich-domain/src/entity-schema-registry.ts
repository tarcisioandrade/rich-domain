import { Entity } from "./entity";
import { ValueObject } from "./value-object";
import { Id } from "./id";

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
   * FK configuration for parent relation.
   */
  parentFk?: {
    /** Name of the FK field in the database (e.g., 'author_id') */
    field: string;
    /** Name of the parent entity (e.g., 'User') */
    parentEntity: string;
  };
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
 *   });
 *
 * const table = registry.getTable('Post'); // 'blog_posts'
 * const mapped = registry.mapFields('User', { email: 'test@test.com' });
 * // { user_email: 'test@test.com' }
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
      throw new Error(
        `EntitySchemaRegistry: No schema registered for entity '${entity}'. ` +
          `Available entities: ${Array.from(this.schemas.keys()).join(", ") || "none"}`
      );
    }
    return schema;
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
      if (this.isEntityOrCollection(value)) {
        continue;
      }
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

    // Map ID if it is an Entity or has entity-like structure
    const hasId = (domainEntity as any).id;
    if (hasId) {
      // Extract id value
      const idValue = hasId.value ?? hasId;
      result["id"] = idValue;
    }

    // Get props
    const props = (domainEntity as any).props || domainEntity;

    for (const [key, value] of Object.entries(props)) {
      if (key === "id") continue; // ID already mapped
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

    // Checks if it has the structure of an Entity (object with 'id' that has 'value')
    if (typeof value === 'object' && value.id && typeof value.id === 'object' && 'value' in value.id) {
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
      // Might be an ID or other wrapper
      return value.value;
    }
    return value;
  }
}
