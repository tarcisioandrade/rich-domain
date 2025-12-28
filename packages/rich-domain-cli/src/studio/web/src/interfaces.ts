export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface MethodInfo {
  name: string;
  signature: string;
}

export interface EnumInfo {
  name: string;
  values: string[];
}

export interface EventHandlerInfo {
  name: string;
  eventType: string;
  filePath: string;
  signature: string;
}

export interface DomainEventInfo {
  name: string;
  filePath: string;
  payloadType: string;
  properties: PropertyInfo[];
  publishers: string[];
  handlers: EventHandlerInfo[];
}

export interface DomainEntity {
  name: string;
  type: "entity" | "aggregate" | "value-object";
  filePath: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  hasSchema: boolean;
  enums: EnumInfo[];
}

export interface DomainStructure {
  entities: DomainEntity[];
  enums: EnumInfo[];
  events: DomainEventInfo[];
  totalFiles: number;
  scannedAt: string;
}

export interface TabState {
  id: string;
  entityName: string | null;
  entityType: EntityType | null;
  code: string;
  label: string;
}

export type ConsolePosition = "bottom" | "right";
export type EntityType = "aggregate" | "entity" | "value-object";
