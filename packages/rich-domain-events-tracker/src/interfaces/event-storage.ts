import type {
  TrackedEvent,
  EventState,
  EventMetadata,
  EventFilters,
  EventStatistics,
} from '../types';

/**
 * Interface para storage de eventos rastreados
 *
 * Implementações devem fornecer persistência para eventos e suas mudanças de estado.
 * A implementação padrão usa SQLite, mas outras podem ser criadas (PostgreSQL, MongoDB, etc).
 *
 * @example
 * ```typescript
 * class PostgresEventStorage implements IEventStorage {
 *   async saveEvent(event: TrackedEvent): Promise<void> {
 *     await this.db.query('INSERT INTO tracked_events ...', event);
 *   }
 * }
 * ```
 */
export interface IEventStorage {
  /**
   * Inicializa o storage (cria tabelas, conexões, etc)
   */
  initialize(): Promise<void>;

  /**
   * Salva um novo evento rastreado
   *
   * @param event - O evento a ser salvo
   */
  saveEvent(event: TrackedEvent): Promise<void>;

  /**
   * Atualiza o estado de um evento
   *
   * @param eventId - ID do evento
   * @param state - Novo estado
   * @param metadata - Metadata adicional (opcional)
   */
  updateEventState(
    eventId: string,
    state: EventState,
    metadata?: EventMetadata
  ): Promise<void>;

  /**
   * Obtém um evento pelo ID
   *
   * @param eventId - ID do evento
   * @returns O evento ou null se não encontrado
   */
  getEvent(eventId: string): Promise<TrackedEvent | null>;

  /**
   * Busca eventos com filtros
   *
   * @param filters - Filtros de busca
   * @returns Lista de eventos que atendem aos filtros
   */
  queryEvents(filters: EventFilters): Promise<TrackedEvent[]>;

  /**
   * Obtém eventos em estado pending
   *
   * @returns Lista de eventos pending
   */
  getPendingEvents(): Promise<TrackedEvent[]>;

  /**
   * Obtém estatísticas de eventos
   *
   * @param filters - Filtros opcionais
   * @returns Estatísticas agregadas
   */
  getStatistics(filters?: EventFilters): Promise<EventStatistics>;

  /**
   * Remove eventos antigos (para políticas de retenção)
   *
   * @param olderThan - Data limite
   * @returns Número de eventos removidos
   */
  cleanupOldEvents(olderThan: Date): Promise<number>;

  /**
   * Deleta um evento pelo ID
   *
   * @param eventId - ID do evento a ser deletado
   * @returns True se o evento foi deletado, false se não foi encontrado
   */
  deleteEvent(eventId: string): Promise<boolean>;

  /**
   * Deleta todos os eventos de um estado específico
   *
   * @param state - Estado dos eventos a serem deletados
   * @returns Número de eventos deletados
   */
  deleteEventsByState(state: EventState): Promise<number>;

  /**
   * Incrementa o contador de retries de um evento
   *
   * @param eventId - ID do evento
   */
  incrementRetryCount(eventId: string): Promise<void>;

  /**
   * Fecha conexões e limpa recursos
   */
  close(): Promise<void>;
}
