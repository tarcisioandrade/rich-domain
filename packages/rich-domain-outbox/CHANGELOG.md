# @woltz/rich-domain-outbox

## 0.1.1

### Patch Changes

- 0ae9cc0: Add Transactional Outbox Pattern support
  - New `@woltz/rich-domain-outbox` package with `OutboxEventBusDecorator`, `OutboxPublisher`, `OutboxEntry`, and `OUTBOX_DDL`
  - Core additions: `IOutboxStore` interface, `OutboxEntryData`, `OutboxFetchResult`, `OutboxStatus` types
  - Prisma adapter: `PrismaOutboxStore` with `PRISMA_OUTBOX_SCHEMA`, auto-save in `PrismaRepository.save()`
  - Drizzle adapter: `DrizzleOutboxStore` with `outboxTable` definition, auto-save in `DrizzleRepository.save()`
  - TypeORM adapter: `TypeORMOutboxStore` with `OutboxEntity`, auto-save in `TypeORMRepository.save()`
  - Outbox events are saved in the same DB transaction as the aggregate, then published by a background polling process

- Updated dependencies [0ae9cc0]
  - @woltz/rich-domain@1.9.1
