import type { IDomainEvent } from '@woltz/rich-domain';
import type {
  ITrackerAdapter,
  EventState,
  EventMetadata,
  JobDetails,
} from '@woltz/rich-domain-events-tracker';
import { Queue, QueueEvents, type Job, type ConnectionOptions } from 'bullmq';

/**
 * Configuração do BullMQTrackerAdapter
 */
export interface BullMQTrackerAdapterConfig {
  /**
   * Configuração de conexão Redis
   * Pode ser uma string de conexão ou opções do IORedis
   */
  connection: ConnectionOptions;

  /**
   * Lista de nomes de filas a serem monitoradas
   * Default: ['default']
   */
  queueNames?: string[];

  /**
   * Nome da fila padrão para eventos sem queueName específico
   * Default: 'default'
   */
  defaultQueueName?: string;

  /**
   * Opções adicionais para as Queues do BullMQ
   */
  queueOptions?: {
    /**
     * Prefixo para as chaves no Redis
     */
    prefix?: string;

    /**
     * Opções de job padrão
     */
    defaultJobOptions?: {
      attempts?: number;
      backoff?: {
        type: string;
        delay: number;
      };
      removeOnComplete?: boolean | number;
      removeOnFail?: boolean | number;
    };
  };
}

/**
 * Adapter BullMQ para tracking de eventos
 *
 * Implementa ITrackerAdapter usando BullMQ como sistema de mensageria.
 * Monitora estados de jobs em tempo real via QueueEvents.
 *
 * @example
 * ```typescript
 * import { BullMQTrackerAdapter } from '@woltz/rich-domain-bullmq-tracker';
 * import { EventTracker, TrackedEventBus } from '@woltz/rich-domain-events-tracker';
 *
 * const adapter = new BullMQTrackerAdapter({
 *   connection: 'redis://localhost:6379',
 *   queueNames: ['main', 'notifications']
 * });
 *
 * const tracker = new EventTracker({ adapter });
 * await tracker.initialize();
 *
 * // Usar com TrackedEventBus
 * const trackedBus = new TrackedEventBus({
 *   wrappedBus: myEventBus,
 *   tracker
 * });
 * ```
 */
export class BullMQTrackerAdapter implements ITrackerAdapter {
  private queues: Map<string, Queue> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private connection: ConnectionOptions;
  private queueNames: string[];
  private defaultQueueName: string;
  private queueOptions?: BullMQTrackerAdapterConfig['queueOptions'];

  constructor(config: BullMQTrackerAdapterConfig) {
    this.connection = config.connection;
    this.queueNames = config.queueNames || ['default'];
    this.defaultQueueName = config.defaultQueueName || 'default';
    this.queueOptions = config.queueOptions;

    // Garante que defaultQueueName está na lista
    if (!this.queueNames.includes(this.defaultQueueName)) {
      this.queueNames.push(this.defaultQueueName);
    }
  }

  /**
   * Publica evento no BullMQ e retorna identificadores
   */
  async onEventPublished(
    event: IDomainEvent
  ): Promise<{ jobId: string; queueName: string }> {
    const queueName = this.getQueueNameForEvent(event);
    const queue = this.getQueue(queueName);

    // Adiciona job à fila
    const job = await queue.add(
      event.eventName,
      event,
      this.queueOptions?.defaultJobOptions
    );

    if (!job.id) {
      throw new Error(
        `BullMQ job created without ID for event ${event.eventId}`
      );
    }

    return {
      jobId: job.id,
      queueName,
    };
  }

  /**
   * Inicia monitoramento de mudanças de estado via QueueEvents
   */
  async startMonitoring(callbacks: {
    onStateChange: (
      eventId: string,
      state: EventState,
      metadata?: EventMetadata
    ) => Promise<void>;
  }): Promise<void> {
    for (const queueName of this.queueNames) {
      const queueEvents = new QueueEvents(queueName, {
        connection: this.connection,
        prefix: this.queueOptions?.prefix,
      });

      this.queueEvents.set(queueName, queueEvents);

      // Waiting (adicionado à fila)
      queueEvents.on('waiting', async ({ jobId }) => {
        const job = await this.getJobFromQueue(queueName, jobId);
        if (job && this.isTrackedEvent(job.data)) {
          await callbacks.onStateChange(job.data.eventId, 'pending', {
            payload: job.data.payload,
          });
        }
      });

      // Active (processamento iniciado)
      queueEvents.on('active', async ({ jobId }) => {
        const job = await this.getJobFromQueue(queueName, jobId);
        if (job && this.isTrackedEvent(job.data)) {
          await callbacks.onStateChange(job.data.eventId, 'active', {
            processedAt: new Date(),
          });
        }
      });

      // Completed (sucesso)
      queueEvents.on('completed', async ({ jobId, returnvalue }) => {
        const job = await this.getJobFromQueue(queueName, jobId);
        if (job && this.isTrackedEvent(job.data)) {
          await callbacks.onStateChange(job.data.eventId, 'succeeded', {
            finishedAt: new Date(),
            result: returnvalue,
          });
        }
      });

      // Failed (falha)
      queueEvents.on('failed', async ({ jobId, failedReason }) => {
        const job = await this.getJobFromQueue(queueName, jobId);
        if (job && this.isTrackedEvent(job.data)) {
          const isRetrying = job.attemptsMade < (job.opts.attempts || 1);

          await callbacks.onStateChange(
            job.data.eventId,
            isRetrying ? 'retrying' : 'failed',
            {
              error: failedReason,
              attempts: job.attemptsMade,
              finishedAt: isRetrying ? undefined : new Date(),
            }
          );
        }
      });

      // Delayed (agendado para o futuro)
      queueEvents.on('delayed', async ({ jobId, delay }) => {
        const job = await this.getJobFromQueue(queueName, jobId);
        if (job && this.isTrackedEvent(job.data)) {
          await callbacks.onStateChange(job.data.eventId, 'delayed', {
            delayedUntil: new Date(Date.now() + delay),
          });
        }
      });

      // Retries exhausted
      queueEvents.on('retries-exhausted', async ({ jobId }) => {
        const job = await this.getJobFromQueue(queueName, jobId);
        if (job && this.isTrackedEvent(job.data)) {
          await callbacks.onStateChange(job.data.eventId, 'failed', {
            error: 'Max retries exhausted',
            attempts: job.attemptsMade,
            finishedAt: new Date(),
          });
        }
      });
    }

    // Aguarda conexão de todos os QueueEvents
    await Promise.all(
      Array.from(this.queueEvents.values()).map((qe) =>
        qe.waitUntilReady()
      )
    );
  }

  /**
   * Para o monitoramento e fecha conexões
   */
  async stopMonitoring(): Promise<void> {
    // Fecha QueueEvents
    await Promise.all(
      Array.from(this.queueEvents.values()).map((qe) => qe.close())
    );
    this.queueEvents.clear();

    // Fecha Queues
    await Promise.all(
      Array.from(this.queues.values()).map((q) => q.close())
    );
    this.queues.clear();
  }

  /**
   * Obtém detalhes de um job específico
   */
  async getJobDetails(jobId: string): Promise<JobDetails | null> {
    // Tenta encontrar o job em todas as filas
    for (const queueName of this.queueNames) {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (job && this.isTrackedEvent(job.data)) {
        const state = await job.getState();

        return {
          jobId: job.id!,
          state: this.mapBullMQState(state),
          metadata: {
            payload: job.data.payload,
            error: job.failedReason,
            stacktrace: job.stacktrace?.join('\n'),
            attempts: job.attemptsMade,
            processedAt: job.processedOn
              ? new Date(job.processedOn)
              : undefined,
            finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
            progress: job.progress,
            returnValue: job.returnvalue,
          },
        };
      }
    }

    return null;
  }

  /**
   * Re-enfileira um evento (replay)
   */
  async replayEvent(event: IDomainEvent): Promise<void> {
    const queueName = this.getQueueNameForEvent(event);
    const queue = this.getQueue(queueName);

    await queue.add(
      event.eventName,
      event,
      this.queueOptions?.defaultJobOptions
    );
  }

  /**
   * Helpers privados
   */

  private getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: this.connection,
        prefix: this.queueOptions?.prefix,
        defaultJobOptions: this.queueOptions?.defaultJobOptions,
      });

      this.queues.set(queueName, queue);
    }

    return this.queues.get(queueName)!;
  }

  private async getJobFromQueue(
    queueName: string,
    jobId: string
  ): Promise<Job | undefined> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  private getQueueNameForEvent(event: IDomainEvent): string {
    // Tenta obter queueName da propriedade estática da classe do evento
    const eventClass = event.constructor as any;
    return eventClass.queueName || event.queueName || this.defaultQueueName;
  }

  private mapBullMQState(bullState: string): EventState {
    const mapping: Record<string, EventState> = {
      waiting: 'pending',
      'waiting-children': 'pending',
      delayed: 'delayed',
      active: 'active',
      completed: 'succeeded',
      failed: 'failed',
      paused: 'pending',
      'unknown': 'unknown',
    };

    return mapping[bullState] || 'unknown';
  }

  private isTrackedEvent(data: any): data is IDomainEvent {
    return (
      data &&
      typeof data === 'object' &&
      'eventId' in data &&
      'eventName' in data &&
      'occurredOn' in data
    );
  }
}
