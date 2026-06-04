import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
} from "typeorm";

/**
 * TypeORM entity for the outbox table.
 *
 * Register this entity in your TypeORM DataSource configuration:
 *
 * @example
 * ```typescript
 * import { OutboxEntity } from "@woltz/rich-domain-typeorm";
 *
 * const dataSource = new DataSource({
 *   entities: [User, Post, OutboxEntity],
 *   // ...
 * });
 * ```
 *
 * Then run your TypeORM migration as usual (`typeorm migration:generate`).
 */
@Entity("outbox")
export class OutboxEntity {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Column({ type: "text", name: "event_name" })
  eventName!: string;

  @Column({ type: "jsonb" })
  payload!: unknown;

  @Column({ type: "timestamptz", name: "occurred_on" })
  occurredOn!: Date;

  @Index()
  @Column({ type: "text", default: "pending" })
  status!: string;

  @Column({ type: "integer", default: 0 })
  retries!: number;

  @Column({ type: "text", nullable: true, name: "last_error" })
  lastError!: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
}
