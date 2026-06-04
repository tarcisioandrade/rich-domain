/**
 * Raw SQL DDL templates for creating the outbox table.
 *
 * Use these if you are NOT using an ORM adapter (Prisma, Drizzle, TypeORM).
 * Run the appropriate DDL as a migration against your database.
 *
 * @example PostgreSQL
 * ```typescript
 * import { OUTBOX_DDL } from "@woltz/rich-domain-outbox";
 * await db.query(OUTBOX_DDL.postgresql);
 * ```
 */
export const OUTBOX_DDL = {
  /**
   * PostgreSQL DDL for the outbox table.
   *
   * The `id` column stores the domain event's `eventId` as the primary key.
   * `markPublished(eventId)` = `UPDATE outbox SET status = 'published' WHERE id = $1`
   */
  postgresql: [
    `CREATE TABLE IF NOT EXISTS "outbox" (
  "id" TEXT PRIMARY KEY,
  "eventName" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "occurredOn" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "retries" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
    `CREATE INDEX IF NOT EXISTS "idx_outbox_status" ON "outbox" ("status")`,
  ].join(";\n"),

  /**
   * MySQL DDL for the outbox table.
   */
  mysql: [
    "CREATE TABLE IF NOT EXISTS `outbox` (" +
      "`id` VARCHAR(255) PRIMARY KEY, " +
      "`eventName` VARCHAR(255) NOT NULL, " +
      "`payload` JSON NOT NULL, " +
      "`occurredOn` DATETIME(3) NOT NULL, " +
      "`status` VARCHAR(50) NOT NULL DEFAULT 'pending', " +
      "`retries` INT NOT NULL DEFAULT 0, " +
      "`lastError` TEXT, " +
      "`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)" +
      ")",
    "CREATE INDEX `idx_outbox_status` ON `outbox` (`status`)",
  ].join(";\n"),
} as const;
