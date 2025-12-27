import { create } from "zustand";

interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
}

interface MethodInfo {
  name: string;
  signature: string;
}

interface EnumInfo {
  name: string;
  values: string[];
}

interface DomainEntity {
  name: string;
  type: "entity" | "aggregate" | "value-object";
  filePath: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  hasSchema: boolean;
  enums: EnumInfo[];
}

interface DomainStructure {
  entities: DomainEntity[];
  enums: EnumInfo[];
  totalFiles: number;
  scannedAt: string;
}

interface ExecutionOutput {
  success: boolean;
  output?: any;
  logs?: string[];
  errors?: Array<{
    message: string;
    stack?: string;
    line?: number;
  }>;
  validationErrors?: Array<{
    path: string;
    message: string;
    expected?: any;
    received?: any;
  }>;
}

interface StudioStore {
  domain: DomainStructure | null;
  output: ExecutionOutput | null;
  loading: boolean;
  error: string | null;

  fetchDomain: () => Promise<void>;
  executeCode: (code: string) => Promise<void>;
  clearOutput: () => void;
}

export const useStudioStore = create<StudioStore>((set) => ({
  domain: null,
  output: null,
  loading: false,
  error: null,

  fetchDomain: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/domain");
      const result = await response.json();

      if (result.success) {
        set({ domain: result.data, loading: false });
      } else {
        set({ error: result.error, loading: false });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch domain",
        loading: false,
      });
    }
  },

  executeCode: async (code: string) => {
    console.log("[STORE] executeCode called with code:", code.substring(0, 50));
    set({ output: null, error: null });
    try {
      console.log("[STORE] Sending POST to /api/execute");
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      console.log("[STORE] Response status:", response.status);
      const result = await response.json();
      console.log("[STORE] Result:", result);

      if (result.success) {
        set({ output: result.data });
      } else {
        set({
          output: {
            success: false,
            errors: [{ message: result.error }],
          },
        });
      }
    } catch (error) {
      set({
        output: {
          success: false,
          errors: [
            {
              message:
                error instanceof Error ? error.message : "Execution failed",
            },
          ],
        },
      });
    }
  },

  clearOutput: () => set({ output: null }),
}));
