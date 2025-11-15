export { Aggregate } from './core/domain/aggregate';
export {
  Author,
  AuthorContext,
  AuthorProps,
  BaseAuthorProps,
  CustomerAuthorProps,
  ManagerAuthorProps,
} from './core/domain/author';
export { DomainEvent } from './core/domain/domain-event';
export { Entity } from './core/domain/entity';
export { Snapshot } from './core/domain/history-snapshot';
export { EntityHook, VoHooks } from './core/domain/hooks';
export { Id } from './core/domain/ids';
export { is } from './core/domain/validation-is';
export { ValueObject } from './core/domain/value-object';
export { DomainError as Error } from './core/errors';
export type {
  EntityConfig,
  EntityInput,
  EntityProps,
  SnapshotTrace,
} from './core/interface/types';
