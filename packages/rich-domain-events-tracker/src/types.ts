/**
 * Estados possíveis de um evento rastreado
 */
export type EventState =
  | 'pending'    // Aguardando processamento (na fila)
  | 'active'     // Sendo processado agora
  | 'succeeded'  // Processado com sucesso
  | 'failed'     // Falhou (após todas as tentativas)
  | 'delayed'    // Delayed/scheduled para o futuro
  | 'retrying'   // Falhou mas vai tentar novamente
  | 'unknown';   // Job não encontrado

/**
 * Metadata adicional sobre o processamento de um evento
 */
export interface EventMetadata {
  payload?: any;
  error?: string;
  stacktrace?: string;
  attempts?: number;
  processedAt?: Date;
  finishedAt?: Date;
  result?: any;
  replayedAt?: Date;
  replayCount?: number;
  [key: string]: any;
}

/**
 * Detalhes de um job/mensagem no sistema de mensageria
 */
export interface JobDetails {
  jobId: string;
  state: EventState;
  metadata: EventMetadata;
}

/**
 * Evento rastreado com todas as informações
 */
export interface TrackedEvent {
  id?: number;
  eventId: string;
  eventName: string;
  payload: any;
  occurredOn: Date | string;
  jobId?: string;
  queueName?: string;
  state: EventState;
  metadata?: EventMetadata;
  createdAt: Date | string;
  updatedAt?: Date | string;
  retryCount?: number;  // Número de retries (tentativas após a primeira)
}

/**
 * Filtros para busca de eventos
 */
export interface EventFilters {
  eventName?: string;
  state?: EventState | EventState[];
  queueName?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  limit?: number;
  offset?: number;
}

/**
 * Estatísticas de eventos
 */
export interface EventStatistics {
  total: number;
  byState: Record<EventState, number>;
  byEventName: Record<string, number>;
  byQueue: Record<string, number>;
  avgProcessingTime?: number;
  failureRate?: number;
}

/**
 * Resultado de atualização de estado
 */
export interface StateUpdateResult {
  success: boolean;
  eventId: string;
  previousState?: EventState;
  newState: EventState;
}
