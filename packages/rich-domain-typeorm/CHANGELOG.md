# Changelog

## 0.1.6

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

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.4](https://github.com/tarcisioandrade/rich-domain/compare/v0.7.5...v0.1.4) (2026-01-25)

### [0.1.2](https://github.com/tarcisioandrade/rich-domain/compare/v0.7.4...v0.1.2) (2026-01-09)

### [0.1.1](https://github.com/tarcisioandrade/rich-domain/compare/v0.1.2...v0.1.1) (2025-12-14)

### Features

- add 'add' command to CLI for generating entities, repositories, and mappers ([0bbf235](https://github.com/tarcisioandrade/rich-domain/commit/0bbf235bb542faccfccf2cf9c39f8d781a2a3bce))
- fastify with typeorm example ([92ad1ee](https://github.com/tarcisioandrade/rich-domain/commit/92ad1eeb1c69debd805cb9d8501025fad4bfe4d1))
- rich-domain-typeorm-adapter ([0ab89f1](https://github.com/tarcisioandrade/rich-domain/commit/0ab89f1c52a96737d40fd8893f7fff4d3ece3c45))

### Bug Fixes

- query builder incorrect filters ([b05cb79](https://github.com/tarcisioandrade/rich-domain/commit/b05cb79d2bb338e02e0ad2023e9e3fb268e2df71))
- search query with insensitive case and error in disconect N:N relations ([eca2206](https://github.com/tarcisioandrade/rich-domain/commit/eca2206c10e5f7d0fa173abdb810dfb8a264979d))
