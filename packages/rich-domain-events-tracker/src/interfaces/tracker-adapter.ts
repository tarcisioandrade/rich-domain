import type { IDomainEvent } from '@woltz/rich-domain';
import type { EventState, EventMetadata, JobDetails } from '../types';

/**
 * Interface que adapters de mensageria devem implementar
 *
 * Adapters são responsáveis por:
 * - Publicar eventos no sistema de mensageria
 * - Monitorar mudanças de estado dos eventos
 * - Fornecer detalhes de jobs/mensagens
 * - Implementar replay de eventos
 *
 * @example
 * ```typescript
 * class BullMQTrackerAdapter implements ITrackerAdapter {
 *   async onEventPublished(event: IDomainEvent) {
 *     const job = await this.queue.add(event.eventName, event);
 *     return { jobId: job.id!, queueName: 'main' };
 *   }
 *
 *   async startMonitoring(callbacks) {
 *     this.queueEvents.on('completed', async ({ jobId }) => {
 *       const job = await this.queue.getJob(jobId);
 *       await callbacks.onStateChange(job.data.eventId, 'succeeded');
 *     });
 *   }
 * }
 * ```
 */
export interface ITrackerAdapter {
  /**
   * Chamado quando um evento é publicado no event bus
   * Deve registrar o evento no sistema de mensageria e retornar identificadores
   *
   * @param event - O evento de domínio a ser publicado
   * @returns Identificador único do job/mensagem e nome da fila
   */
  onEventPublished(event: IDomainEvent): Promise<{
    jobId: string;
    queueName: string;
  }>;

  /**
   * Inicia o monitoramento contínuo de estados
   * Deve chamar callbacks quando estados mudarem
   *
   * @param callbacks - Funções callback para notificar mudanças de estado
   */
  startMonitoring(callbacks: {
    onStateChange: (
      eventId: string,
      state: EventState,
      metadata?: EventMetadata
    ) => Promise<void>;
  }): Promise<void>;

  /**
   * Para o monitoramento de eventos
   * Deve limpar recursos e listeners
   */
  stopMonitoring(): Promise<void>;

  /**
   * Obtém informações detalhadas de um job/mensagem específico
   *
   * @param jobId - Identificador do job
   * @returns Detalhes do job ou null se não encontrado
   */
  getJobDetails(jobId: string): Promise<JobDetails | null>;

  /**
   * Replay de um evento (re-enfileira)
   *
   * @param event - O evento a ser repetido
   */
  replayEvent(event: IDomainEvent): Promise<void>;
}
