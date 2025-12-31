import type { FastifyInstance } from "fastify";
import { SQLiteEventStorage, type EventFilters, type EventState } from "@woltz/rich-domain-events-tracker";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

// Singleton instance of storage
let storage: SQLiteEventStorage | null = null;

function getStorage(): SQLiteEventStorage {
  if (!storage) {
    // Ensure .rich-domain directory exists
    const richDomainDir = join(process.cwd(), ".rich-domain");
    if (!existsSync(richDomainDir)) {
      mkdirSync(richDomainDir, { recursive: true });
    }

    const dbPath = join(richDomainDir, "events.db");
    storage = new SQLiteEventStorage(dbPath);
  }
  return storage;
}

/**
 * Register event tracking routes
 */
export async function registerEventRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/events
   * Query tracked events with filters
   */
  fastify.get<{
    Querystring: {
      state?: string | string[];
      eventName?: string;
      queueName?: string;
      limit?: string;
      offset?: string;
      from?: string;
      to?: string;
    };
  }>("/api/events", async (request, reply) => {
    try {
      const storage = getStorage();
      await storage.initialize();

      const { state, eventName, queueName, limit, offset, from, to } =
        request.query;

      const filters: EventFilters = {
        eventName,
        queueName,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      };

      if (state) {
        filters.state = Array.isArray(state) ? state as any : state as any;
      }

      if (from && to) {
        filters.dateRange = {
          from: new Date(from),
          to: new Date(to),
        };
      }

      const events = await storage.queryEvents(filters);

      return {
        success: true,
        data: events,
        count: events.length,
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  /**
   * GET /api/events/stats
   * Get event statistics
   */
  fastify.get<{
    Querystring: {
      from?: string;
      to?: string;
    };
  }>("/api/events/stats", async (request, reply) => {
    try {
      const storage = getStorage();
      await storage.initialize();

      const { from, to } = request.query;

      const filters: EventFilters = {};

      if (from && to) {
        filters.dateRange = {
          from: new Date(from),
          to: new Date(to),
        };
      }

      const stats = await storage.getStatistics(filters);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  /**
   * GET /api/events/:id
   * Get single event by ID
   */
  fastify.get<{
    Params: { id: string };
  }>("/api/events/:id", async (request, reply) => {
    try {
      const storage = getStorage();
      await storage.initialize();

      const { id } = request.params;
      const event = await storage.getEvent(id);

      if (!event) {
        reply.code(404);
        return {
          success: false,
          error: "Event not found",
        };
      }

      return {
        success: true,
        data: event,
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  /**
   * DELETE /api/events/cleanup
   * Cleanup old events
   */
  fastify.delete<{
    Querystring: {
      days?: string;
    };
  }>("/api/events/cleanup", async (request, reply) => {
    try {
      const storage = getStorage();
      await storage.initialize();

      const { days = "30" } = request.query;
      const daysNum = parseInt(days, 10);
      const olderThan = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

      const removed = await storage.cleanupOldEvents(olderThan);

      return {
        success: true,
        data: {
          removed,
          olderThan: olderThan.toISOString(),
        },
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  /**
   * DELETE /api/events/:id
   * Delete a single event
   */
  fastify.delete<{
    Params: { id: string };
  }>("/api/events/:id", async (request, reply) => {
    try {
      const storage = getStorage();
      await storage.initialize();

      const { id } = request.params;
      const deleted = await storage.deleteEvent(id);

      if (!deleted) {
        reply.code(404);
        return {
          success: false,
          error: "Event not found",
        };
      }

      return {
        success: true,
        data: { eventId: id },
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  /**
   * DELETE /api/events/state/:state
   * Delete all events of a specific state
   */
  fastify.delete<{
    Params: { state: EventState };
  }>("/api/events/state/:state", async (request, reply) => {
    try {
      const storage = getStorage();
      await storage.initialize();

      const { state } = request.params;

      // Validate state
      const validStates = ['pending', 'active', 'succeeded', 'failed', 'delayed', 'retrying', 'unknown'];
      if (!validStates.includes(state)) {
        reply.code(400);
        return {
          success: false,
          error: `Invalid state: ${state}`,
        };
      }

      const count = await storage.deleteEventsByState(state as EventState);

      return {
        success: true,
        data: {
          state,
          deleted: count,
        },
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });
}

/**
 * Cleanup storage on shutdown
 */
export async function closeStorage() {
  if (storage) {
    await storage.close();
    storage = null;
  }
}
