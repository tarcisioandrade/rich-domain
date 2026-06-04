import { Aggregate } from "@woltz/rich-domain";
import { ObjectLiteral } from "typeorm";

/**
 * Base class for mapping TypeORM entities to domain entities.
 *
 * Provides a structured way to convert persistence layer entities
 * back into rich domain objects.
 *
 * @example
 * ```typescript
 * class PostToDomainMapper extends TypeORMToDomain<PostEntity, Post> {
 *   map(entity: PostEntity): Post {
 *     return Post.reconstitute({
 *       id: new Id(entity.id),
 *       title: entity.title,
 *       content: entity.content,
 *       comments: entity.comments?.map(c => this.mapComment(c)) ?? [],
 *       tags: entity.tags?.map(t => this.mapTag(t)) ?? [],
 *       createdAt: entity.createdAt,
 *       updatedAt: entity.updatedAt
 *     });
 *   }
 *
 *   private mapComment(entity: CommentEntity): Comment {
 *     return Comment.reconstitute({
 *       id: new Id(entity.id),
 *       text: entity.text,
 *       createdAt: entity.createdAt
 *     });
 *   }
 *
 *   private mapTag(entity: TagEntity): Tag {
 *     return new Tag({ name: entity.name });
 *   }
 * }
 * ```
 */
export abstract class TypeORMToDomain<
  TEntity extends ObjectLiteral,
  TDomain extends Aggregate<any>,
> {
  /**
   * Map TypeORM entity to domain entity.
   *
   * @param entity - TypeORM entity from database
   * @returns Domain entity
   */
  abstract map(entity: TEntity): TDomain;

  /**
   * Map multiple entities to domain entities.
   *
   * @param entities - Array of TypeORM entities
   * @returns Array of domain entities
   */
  mapMany(entities: TEntity[]): TDomain[] {
    return entities.map((entity) => this.map(entity));
  }

  /**
   * Map entity to domain or return null.
   *
   * Useful for optional relations or nullable results.
   *
   * @param entity - TypeORM entity or null/undefined
   * @returns Domain entity or null
   */
  mapOrNull(entity: TEntity | null | undefined): TDomain | null {
    return entity ? this.map(entity) : null;
  }
}
