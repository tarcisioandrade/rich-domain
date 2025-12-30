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
   * Fecha conexões e limpa recursos
   */
  close(): Promise<void>;
}
