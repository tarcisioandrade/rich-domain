import Database from "better-sqlite3";
import type { IEventStorage } from "../interfaces";
import type {
  TrackedEvent,
  EventState,
  EventMetadata,
  EventFilters,
  EventStatistics,
} from "../types";

/**
 * Implementação de storage usando SQLite
 *
 * Usa better-sqlite3 para persistência local de eventos rastreados.
 * Ideal para desenvolvimento e pequenos projetos.
 *
 * @example
 * ```typescript
 * const storage = new SQLiteEventStorage('./events.db');
 * await storage.initialize();
 * await storage.saveEvent({
 *   eventId: 'evt-123',
 *   eventName: 'UserCreated',
 *   payload: { email: 'user@example.com' },
 *   state: 'pending',
 *   occurredOn: new Date(),
 *   createdAt: new Date()
 * });
 * ```
 */
export class SQLiteEventStorage implements IEventStorage {
  private db: Database.Database | null = null;

  /**
   * @param dbPath - Caminho para o arquivo SQLite
   * @param options - Opções do better-sqlite3
   */
  constructor(private dbPath: string, private options?: Database.Options) {}

  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath, {
      ...this.options,
      // WAL mode para melhor concorrência
      verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
    });

    // Ativa WAL mode para melhor concorrência
    this.db.pragma("journal_mode = WAL");

    // Cria tabela de eventos
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tracked_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        event_name TEXT NOT NULL,
        payload TEXT NOT NULL,
        occurred_on TEXT NOT NULL,
        job_id TEXT,
        queue_name TEXT,
        state TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        retry_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_event_id ON tracked_events(event_id);
      CREATE INDEX IF NOT EXISTS idx_state ON tracked_events(state);
      CREATE INDEX IF NOT EXISTS idx_event_name ON tracked_events(event_name);
      CREATE INDEX IF NOT EXISTS idx_queue_name ON tracked_events(queue_name);
      CREATE INDEX IF NOT EXISTS idx_created_at ON tracked_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_occurred_on ON tracked_events(occurred_on);
      CREATE INDEX IF NOT EXISTS idx_retry_count ON tracked_events(retry_count);
    `);
  }

  async saveEvent(event: TrackedEvent): Promise<void> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      INSERT INTO tracked_events (
        event_id, event_name, payload, occurred_on, job_id, queue_name,
        state, metadata, created_at, updated_at, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.eventId,
      event.eventName,
      JSON.stringify(event.payload),
      this.toISOString(event.occurredOn),
      event.jobId || null,
      event.queueName || null,
      event.state,
      event.metadata ? JSON.stringify(event.metadata) : null,
      this.toISOString(event.createdAt),
      event.updatedAt ? this.toISOString(event.updatedAt) : null,
      event.retryCount ?? 0
    );
  }

  async updateEventState(
    eventId: string,
    state: EventState,
    metadata?: EventMetadata
  ): Promise<void> {
    this.ensureInitialized();

    // Obtém metadata atual
    const current = await this.getEvent(eventId);
    if (!current) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Merge metadata
    const mergedMetadata = {
      ...current.metadata,
      ...metadata,
    };

    const stmt = this.db!.prepare(`
      UPDATE tracked_events
      SET state = ?, metadata = ?, updated_at = ?
      WHERE event_id = ?
    `);

    stmt.run(
      state,
      JSON.stringify(mergedMetadata),
      new Date().toISOString(),
      eventId
    );
  }

  async getEvent(eventId: string): Promise<TrackedEvent | null> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      SELECT * FROM tracked_events WHERE event_id = ?
    `);

    const row = stmt.get(eventId) as any;
    return row ? this.rowToEvent(row) : null;
  }

  async queryEvents(filters: EventFilters): Promise<TrackedEvent[]> {
    this.ensureInitialized();

    let query = "SELECT * FROM tracked_events WHERE 1=1";
    const params: any[] = [];

    if (filters.eventName) {
      query += " AND event_name = ?";
      params.push(filters.eventName);
    }

    if (filters.state) {
      if (Array.isArray(filters.state)) {
        query += ` AND state IN (${filters.state.map(() => "?").join(",")})`;
        params.push(...filters.state);
      } else {
        query += " AND state = ?";
        params.push(filters.state);
      }
    }

    if (filters.queueName) {
      query += " AND queue_name = ?";
      params.push(filters.queueName);
    }

    if (filters.dateRange) {
      query += " AND occurred_on BETWEEN ? AND ?";
      params.push(
        filters.dateRange.from.toISOString(),
        filters.dateRange.to.toISOString()
      );
    }

    query += " ORDER BY created_at DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += " OFFSET ?";
      params.push(filters.offset);
    }

    const stmt = this.db!.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => this.rowToEvent(row));
  }

  async getPendingEvents(): Promise<TrackedEvent[]> {
    return this.queryEvents({ state: "pending" });
  }

  async getStatistics(filters?: EventFilters): Promise<EventStatistics> {
    this.ensureInitialized();

    let whereClause = "1=1";
    const params: any[] = [];

    if (filters?.eventName) {
      whereClause += " AND event_name = ?";
      params.push(filters.eventName);
    }

    if (filters?.queueName) {
      whereClause += " AND queue_name = ?";
      params.push(filters.queueName);
    }

    if (filters?.dateRange) {
      whereClause += " AND occurred_on BETWEEN ? AND ?";
      params.push(
        filters.dateRange.from.toISOString(),
        filters.dateRange.to.toISOString()
      );
    }

    // Total
    const totalStmt = this.db!.prepare(
      `SELECT COUNT(*) as count FROM tracked_events WHERE ${whereClause}`
    );
    const total = (totalStmt.get(...params) as any).count;

    // By state
    const byStateStmt = this.db!.prepare(`
      SELECT state, COUNT(*) as count
      FROM tracked_events
      WHERE ${whereClause}
      GROUP BY state
    `);
    const byStateRows = byStateStmt.all(...params) as any[];
    const byState: Record<EventState, number> = {
      pending: 0,
      active: 0,
      succeeded: 0,
      failed: 0,
      delayed: 0,
      retrying: 0,
      unknown: 0,
    };
    byStateRows.forEach((row) => {
      byState[row.state as EventState] = row.count;
    });

    // By event name
    const byEventNameStmt = this.db!.prepare(`
      SELECT event_name, COUNT(*) as count
      FROM tracked_events
      WHERE ${whereClause}
      GROUP BY event_name
    `);
    const byEventNameRows = byEventNameStmt.all(...params) as any[];
    const byEventName: Record<string, number> = {};
    byEventNameRows.forEach((row) => {
      byEventName[row.event_name] = row.count;
    });

    // By queue
    const byQueueStmt = this.db!.prepare(`
      SELECT queue_name, COUNT(*) as count
      FROM tracked_events
      WHERE ${whereClause} AND queue_name IS NOT NULL
      GROUP BY queue_name
    `);
    const byQueueRows = byQueueStmt.all(...params) as any[];
    const byQueue: Record<string, number> = {};
    byQueueRows.forEach((row) => {
      byQueue[row.queue_name] = row.count;
    });

    // Average processing time (if metadata has processedAt and finishedAt)
    const avgTimeStmt = this.db!.prepare(`
      SELECT metadata
      FROM tracked_events
      WHERE ${whereClause} AND state = 'succeeded' AND metadata IS NOT NULL
    `);
    const metadataRows = avgTimeStmt.all(...params) as any[];
    let totalProcessingTime = 0;
    let processedCount = 0;

    metadataRows.forEach((row) => {
      try {
        const metadata = JSON.parse(row.metadata);
        if (metadata.processedAt && metadata.finishedAt) {
          const processed = new Date(metadata.processedAt);
          const finished = new Date(metadata.finishedAt);
          totalProcessingTime += finished.getTime() - processed.getTime();
          processedCount++;
        }
      } catch {
        // Ignora erros de parse
      }
    });

    const avgProcessingTime =
      processedCount > 0 ? totalProcessingTime / processedCount : undefined;

    // Failure rate
    const failureRate = total > 0 ? (byState.failed / total) * 100 : undefined;

    return {
      total,
      byState,
      byEventName,
      byQueue,
      avgProcessingTime,
      failureRate,
    };
  }

  async cleanupOldEvents(olderThan: Date): Promise<number> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      DELETE FROM tracked_events
      WHERE created_at < ?
    `);

    const result = stmt.run(olderThan.toISOString());
    return result.changes;
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      DELETE FROM tracked_events WHERE event_id = ?
    `);

    const result = stmt.run(eventId);
    return result.changes > 0;
  }

  async deleteEventsByState(state: EventState): Promise<number> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      DELETE FROM tracked_events WHERE state = ?
    `);

    const result = stmt.run(state);
    return result.changes;
  }

  async incrementRetryCount(eventId: string): Promise<void> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      UPDATE tracked_events
      SET retry_count = COALESCE(retry_count, 0) + 1,
          updated_at = ?
      WHERE event_id = ?
    `);

    stmt.run(new Date().toISOString(), eventId);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Helpers
   */

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error("Storage not initialized. Call initialize() first.");
    }
  }

  private rowToEvent(row: any): TrackedEvent {
    return {
      id: row.id,
      eventId: row.event_id,
      eventName: row.event_name,
      payload: JSON.parse(row.payload),
      occurredOn: new Date(row.occurred_on),
      jobId: row.job_id,
      queueName: row.queue_name,
      state: row.state,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      retryCount: row.retry_count ?? 0,
    };
  }

  private toISOString(date: Date | string): string {
    return typeof date === "string" ? date : date.toISOString();
  }
}
