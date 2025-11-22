import { ValidationConfig } from ".";

export const DEFAULT_VALIDATION_CONFIG: Required<ValidationConfig> = {
  onCreate: true,
  onUpdate: true,
  throwOnError: true,
};
