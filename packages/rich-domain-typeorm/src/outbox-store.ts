import {
  IDomainEvent,
  IOutboxStore,
  OutboxFetchResult,
} from "@woltz/rich-domain";
import { DataSource, In } from "typeorm";
import { TypeORMUnitOfWork, UOWStorage } from "./unit-of-work";
import { OutboxStoreError } from "./errors";
import { OutboxEntity } from "./outbox-entity";

/**
 * TypeORM implementation of {@link IOutboxStore}.
 *
 * When called inside a {@link TypeORMUnitOfWork} transaction, operations use
 * the same transactional `EntityManager`, guaranteeing that outbox rows are
 * written atomically with the aggregate.
 *
 * When called outside a transaction, falls back to the raw `DataSource.manager`.
 *
 * **Important:** the outbox store relies on `UOWStorage` (the `AsyncLocalStorage`
 * singleton from `rich-domain-typeorm`) to resolve the transactional manager.
 *
 * @example
 * ```typescript
 * const outboxStore = new TypeORMOutboxStore(dataSource);
 * const bus = new OutboxEventBusDecorator(rabbitBus, outboxStore);
 * ```
 */
export class TypeORMOutboxStore implements IOutboxStore {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Get the current TypeORM EntityManager — transactional if inside a UoW
   * transaction, otherwise the default manager.
   */
  private get manager() {
    const ctx = UOWStorage.getStore();
    return ctx?.entityManager ?? this.dataSource.manager;
  }

  async save(events: IDomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const entities = events.map((e) => {
        const entity = new OutboxEntity();
        entity.id = e.eventId;
        entity.eventName = e.eventName;
        entity.payload = e.payload;
        entity.occurredOn = e.occurredOn;
        entity.status = "pending";
        entity.retries = 0;
        entity.lastError = null;
        return entity;
      });
      await this.manager.save(OutboxEntity, entities);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new OutboxStoreError(`Failed to save outbox entries: ${message}`);
    }
  }

  async fetchPending(batchSize = 50): Promise<OutboxFetchResult> {
    const repo = this.manager.getRepository(OutboxEntity);

    const rows = await repo.find({
      where: { status: In(["pending", "failed"]) },
      order: { createdAt: "ASC" },
      take: batchSize,
    });

    return {
      entries: rows.map((r) => ({
        id: r.id,
        eventName: r.eventName,
        payload: r.payload,
        occurredOn: r.occurredOn,
        status: r.status as "pending" | "published" | "failed",
        retries: r.retries,
        lastError: r.lastError,
        createdAt: r.createdAt,
      })),
    };
  }

  async markPublished(id: string): Promise<void> {
    const repo = this.manager.getRepository(OutboxEntity);
    await repo.update(id, { status: "published" });
  }

  async markFailed(id: string, error: string): Promise<void> {
    const repo = this.manager.getRepository(OutboxEntity);
    const entity = await repo.findOneBy({ id });
    if (entity) {
      entity.status = "failed";
      entity.retries += 1;
      entity.lastError = error;
      await repo.save(entity);
    }
  }
}
