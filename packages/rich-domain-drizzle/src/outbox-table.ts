import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Drizzle table definition for the outbox table.
 *
 * Import this in your schema file and add it to your schema object.
 *
 * @example
 * ```typescript
 * import { outboxTable } from "@woltz/rich-domain-drizzle";
 * export const schema = { users, orders, outbox: outboxTable };
 * ```
 *
 * Then run `drizzle-kit generate` and `drizzle-kit migrate` as usual.
 */
export const outboxTable = pgTable(
  "outbox",
  {
    id: text("id").primaryKey(),
    eventName: text("event_name").notNull(),
    payload: jsonb("payload").notNull(),
    occurredOn: timestamp("occurred_on", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    retries: integer("retries").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_outbox_status").on(table.status),
  })
);
