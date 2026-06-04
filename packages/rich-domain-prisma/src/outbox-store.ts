import {
  IDomainEvent,
  IOutboxStore,
  OutboxFetchResult,
} from "@woltz/rich-domain";
import { type PrismaClientLike, UOWStorage } from "./unit-of-work";
import { OutboxStoreError } from "./errors";

/**
 * Prisma implementation of {@link IOutboxStore}.
 *
 * When called inside a {@link PrismaUnitOfWork} transaction, operations use
 * the same transactional client, guaranteeing that outbox rows are written
 * atomically with the aggregate.
 *
 * When called outside a transaction, falls back to the raw Prisma client.
 *
 * **Important:** the outbox store relies on `UOWStorage` (the `AsyncLocalStorage`
 * singleton from `rich-domain-prisma`) to resolve the transactional client.
 * For this to work, your repository operations must run through the same
 * `PrismaUnitOfWork` instance that the rest of your application uses.
 *
 * @example
 * ```typescript
 * const outboxStore = new PrismaOutboxStore(prisma);
 * const bus = new OutboxEventBusDecorator(rabbitBus, outboxStore);
 * ```
 */
export class PrismaOutboxStore implements IOutboxStore {
  constructor(private readonly prisma: PrismaClientLike) {}

  /**
   * Get the current Prisma client — transactional if inside a UoW transaction,
   * otherwise the raw client.
   */
  private get db(): any {
    const ctx = UOWStorage.getStore()?.ctx;
    return ctx?.client ?? this.prisma;
  }

  async save(events: IDomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      await this.db.outbox.createMany({
        data: events.map((e) => ({
          id: e.eventId,
          eventName: e.eventName,
          payload: e.payload,
          occurredOn: e.occurredOn,
          status: "pending",
          retries: 0,
          lastError: null,
        })),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new OutboxStoreError(`Failed to save outbox entries: ${message}`);
    }
  }

  async fetchPending(batchSize = 50): Promise<OutboxFetchResult> {
    const rows = await this.db.outbox.findMany({
      where: {
        status: { in: ["pending", "failed"] },
      },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });

    return {
      entries: rows.map(
        (r: {
          id: string;
          eventName: string;
          payload: unknown;
          occurredOn: Date;
          status: string;
          retries: number;
          lastError: string | null;
          createdAt: Date;
        }) => ({
          id: r.id,
          eventName: r.eventName,
          payload: r.payload,
          occurredOn: r.occurredOn,
          status: r.status as "pending" | "published" | "failed",
          retries: r.retries,
          lastError: r.lastError,
          createdAt: r.createdAt,
        })
      ),
    };
  }

  async markPublished(id: string): Promise<void> {
    await this.db.outbox.update({
      where: { id },
      data: { status: "published" },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.db.outbox.update({
      where: { id },
      data: {
        status: "failed",
        retries: { increment: 1 },
        lastError: error,
      },
    });
  }
}

/**
 * Prisma schema model for the outbox table.
 *
 * Copy this into your `schema.prisma` file and run `npx prisma migrate dev`.
 *
 * @example
 * ```prisma
 * model Outbox {
 *   id          String   @id
 *   eventName   String
 *   payload     Json
 *   occurredOn  DateTime
 *   status      String   @default("pending")
 *   retries     Int      @default(0)
 *   lastError   String?
 *   createdAt   DateTime @default(now())
 *
 *   @@index([status])
 * }
 * ```
 */
export const PRISMA_OUTBOX_SCHEMA = `
model Outbox {
  id          String   @id
  eventName   String
  payload     Json
  occurredOn  DateTime
  status      String   @default("pending")
  retries     Int      @default(0)
  lastError   String?
  createdAt   DateTime @default(now())

  @@index([status])
}
`.trim();
