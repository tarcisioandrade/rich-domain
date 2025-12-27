export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface MethodInfo {
  name: string;
  signature: string;
}

export interface DomainEntity {
  name: string;
  type: "entity" | "aggregate" | "value-object";
  filePath: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  hasSchema: boolean;
}

export interface DomainStructure {
  entities: DomainEntity[];
  totalFiles: number;
  scannedAt: string;
}
