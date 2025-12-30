import type { IDomainEvent, IDomainEventBus } from '@woltz/rich-domain';
import type { EventTracker } from './event-tracker';

/**
 * Configuração do TrackedEventBus
 */
export interface TrackedEventBusConfig {
  /**
   * Event bus real a ser wrapeado
   */
  wrappedBus: IDomainEventBus;

  /**
   * Instância do EventTracker
   */
  tracker: EventTracker;

  /**
   * Se true, tracking errors não interrompem a publicação
   * (default: true)
   */
  swallowTrackingErrors?: boolean;
}

/**
 * Wrapper para IDomainEventBus que adiciona tracking transparente
 *
 * Intercepta chamadas de publish() e publishAll() para registrar eventos
 * no sistema de tracking antes de encaminhar para o bus real.
 *
 * @example
 * ```typescript
 * import { EventTracker, TrackedEventBus } from '@woltz/rich-domain-events-tracker';
 * import { BullMQTrackerAdapter } from '@woltz/rich-domain-bullmq-tracker';
 * import { BullMQEventBus } from './infrastructure/queue/event-bus';
 *
 * const adapter = new BullMQTrackerAdapter(redis, ['main']);
 * const tracker = new EventTracker({ adapter });
 * await tracker.initialize();
 *
 * const realBus = new BullMQEventBus(redis);
 * const trackedBus = new TrackedEventBus({
 *   wrappedBus: realBus,
 *   tracker
 * });
 *
 * // Usa normalmente, tracking é transparente
 * await entity.dispatchAll(trackedBus);
 * ```
 */
export class TrackedEventBus implements IDomainEventBus {
  private wrappedBus: IDomainEventBus;
  private tracker: EventTracker;
  private swallowTrackingErrors: boolean;

  constructor(config: TrackedEventBusConfig) {
    this.wrappedBus = config.wrappedBus;
    this.tracker = config.tracker;
    this.swallowTrackingErrors = config.swallowTrackingErrors ?? true;
  }

  /**
   * Publica um evento com tracking
   *
   * 1. Registra no tracker
   * 2. Publica no bus real
   *
   * Se tracking falhar e swallowTrackingErrors=true, o evento
   * ainda é publicado no bus real (tracking não bloqueia publicação).
   */
  async publish(event: IDomainEvent): Promise<void> {
    // Registra tracking
    try {
      await this.tracker.trackEvent(event);
    } catch (error) {
      if (this.swallowTrackingErrors) {
        console.error('TrackedEventBus: Error tracking event:', error);
      } else {
        throw error;
      }
    }

    // Publica no bus real
    await this.wrappedBus.publish(event);
  }

  /**
   * Publica múltiplos eventos com tracking
   *
   * Tracking é feito em paralelo para melhor performance.
   */
  async publishAll(events: IDomainEvent[]): Promise<void> {
    // Registra tracking de todos os eventos em paralelo
    try {
      await Promise.all(events.map((e) => this.tracker.trackEvent(e)));
    } catch (error) {
      if (this.swallowTrackingErrors) {
        console.error('TrackedEventBus: Error tracking events:', error);
      } else {
        throw error;
      }
    }

    // Publica todos no bus real
    await this.wrappedBus.publishAll(events);
  }
}
