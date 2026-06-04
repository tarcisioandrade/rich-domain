import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "../../env";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
export type DB = ReturnType<typeof drizzle<typeof schema>>;

export async function initializeDatabase() {
  pool = new Pool({ connectionString: env.DATABASE_URL });

  // Verify connection
  await pool.query("SELECT 1");

  db = drizzle(pool, { schema });
}

export function getDb(): DB {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return db;
}

export async function closeDatabase() {
  await pool?.end();
  db = null;
  pool = null;
}
