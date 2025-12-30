import type { IDomainEvent } from '@woltz/rich-domain';
import type { ITrackerAdapter, IEventStorage } from './interfaces';
import type { EventFilters, EventStatistics, TrackedEvent } from './types';
import { SQLiteEventStorage } from './storage';

/**
 * Configuração do EventTracker
 */
export interface EventTrackerConfig {
  /**
   * Adapter específico para o sistema de mensageria
   */
  adapter: ITrackerAdapter;

  /**
   * Storage para persistir eventos (default: SQLiteEventStorage)
   */
  storage?: IEventStorage;

  /**
   * Caminho do banco SQLite (se usar storage padrão)
   */
  dbPath?: string;

  /**
   * Se true, inicia o monitoramento automaticamente no initialize()
   */
  autoStartMonitoring?: boolean;
}

/**
 * Orquestrador principal do sistema de tracking
 *
 * Coordena o adapter (mensageria) com o storage (persistência)
 * para fornecer tracking completo de eventos de domínio.
 *
 * @example
 * ```typescript
 * import { EventTracker } from '@woltz/rich-domain-events-tracker';
 * import { BullMQTrackerAdapter } from '@woltz/rich-domain-bullmq-tracker';
 *
 * const adapter = new BullMQTrackerAdapter(redis, ['main']);
 * const tracker = new EventTracker({ adapter });
 *
 * await tracker.initialize();
 *
 * // Features avançadas
 * await tracker.replayEvent('event-123');
 * const stats = await tracker.getStatistics();
 * ```
 */
export class EventTracker {
  private adapter: ITrackerAdapter;
  private storage: IEventStorage;
  private isMonitoring: boolean = false;

  constructor(config: EventTrackerConfig) {
    this.adapter = config.adapter;
    this.storage =
      config.storage ||
      new SQLiteEventStorage(config.dbPath || './events.db');
  }

  /**
   * Inicializa o tracker e opcionalmente inicia monitoramento
   */
  async initialize(): Promise<void> {
    // Inicializa storage
    await this.storage.initialize();

    // Inicia monitoramento (se configurado)
    await this.startMonitoring();
  }

  /**
   * Inicia o monitoramento de mudanças de estado via adapter
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('EventTracker: Monitoring already started');
      return;
    }

    await this.adapter.startMonitoring({
      onStateChange: async (eventId, state, metadata) => {
        try {
          await this.storage.updateEventState(eventId, state, metadata);
        } catch (error) {
          console.error(
            `EventTracker: Error updating state for ${eventId}:`,
            error
          );
        }
      },
    });

    this.isMonitoring = true;
  }

  /**
   * Para o monitoramento
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    await this.adapter.stopMonitoring();
    this.isMonitoring = false;
  }

  /**
   * Registra um evento para tracking
   *
   * Chamado pelo TrackedEventBus quando um evento é publicado.
   * Registra no adapter (mensageria) e persiste no storage.
   */
  async trackEvent(event: IDomainEvent): Promise<void> {
    // Adapter registra no sistema de mensageria e retorna job info
    const { jobId, queueName } = await this.adapter.onEventPublished(event);

    // Storage persiste no SQLite
    await this.storage.saveEvent({
      eventId: event.eventId,
      eventName: event.eventName,
      payload: event.payload,
      occurredOn: event.occurredOn,
      jobId,
      queueName,
      state: 'pending',
      createdAt: new Date(),
    });
  }

  /**
   * Replay de um evento (re-enfileira)
   *
   * @param eventId - ID do evento a ser repetido
   * @throws Se evento não for encontrado
   */
  async replayEvent(eventId: string): Promise<void> {
    const event = await this.storage.getEvent(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Reconstrói o IDomainEvent a partir do TrackedEvent
    const domainEvent: IDomainEvent = {
      eventId: event.eventId,
      eventName: event.eventName,
      payload: event.payload,
      occurredOn:
        typeof event.occurredOn === 'string'
          ? new Date(event.occurredOn)
          : event.occurredOn,
    };

    // Adapter faz replay no sistema de mensageria
    await this.adapter.replayEvent(domainEvent);

    // Atualiza storage
    await this.storage.updateEventState(eventId, 'pending', {
      ...event.metadata,
      replayedAt: new Date(),
      replayCount: ((event.metadata?.replayCount as number) || 0) + 1,
    });
  }

  /**
   * Obtém um evento pelo ID
   */
  async getEvent(eventId: string): Promise<TrackedEvent | null> {
    return this.storage.getEvent(eventId);
  }

  /**
   * Busca eventos com filtros
   */
  async queryEvents(filters: EventFilters): Promise<TrackedEvent[]> {
    return this.storage.queryEvents(filters);
  }

  /**
   * Obtém eventos em estado pending
   */
  async getPendingEvents(): Promise<TrackedEvent[]> {
    return this.storage.getPendingEvents();
  }

  /**
   * Obtém estatísticas de eventos
   */
  async getStatistics(filters?: EventFilters): Promise<EventStatistics> {
    return this.storage.getStatistics(filters);
  }

  /**
   * Remove eventos antigos (política de retenção)
   *
   * @param olderThan - Data limite
   * @returns Número de eventos removidos
   */
  async cleanupOldEvents(olderThan: Date): Promise<number> {
    return this.storage.cleanupOldEvents(olderThan);
  }

  /**
   * Fecha conexões e limpa recursos
   */
  async shutdown(): Promise<void> {
    await this.stopMonitoring();
    await this.storage.close();
  }

  /**
   * Getters para acesso direto (caso necessário)
   */
  get storageInstance(): IEventStorage {
    return this.storage;
  }

  get adapterInstance(): ITrackerAdapter {
    return this.adapter;
  }
}
