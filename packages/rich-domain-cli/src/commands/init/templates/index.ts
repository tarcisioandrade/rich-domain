import { BaseTemplate, TemplateMetadata } from "./base.template.js";
import { FullstackTemplate } from "./fullstack/index.js";

/**
 * Registry of all available templates
 */
export class TemplateRegistry {
  private templates: Map<string, BaseTemplate> = new Map();

  constructor() {
    this.register(new FullstackTemplate());
    // Register more templates here:
    // this.register(new MinimalTemplate());
    // this.register(new MonorepoTemplate());
    // this.register(new MicroserviceTemplate());
  }

  register(template: BaseTemplate): void {
    this.templates.set(template.metadata.name, template);
  }

  get(name: string): BaseTemplate | undefined {
    return this.templates.get(name);
  }

  getAll(): BaseTemplate[] {
    return Array.from(this.templates.values());
  }

  getAllMetadata(): TemplateMetadata[] {
    return this.getAll().map((t) => t.metadata);
  }

  has(name: string): boolean {
    return this.templates.has(name);
  }
}

export const templateRegistry = new TemplateRegistry();

// Re-export
export type {
  BaseTemplate,
  TemplateMetadata,
  TemplateOptions,
  TemplateFile,
} from "./base.template";
export { FullstackTemplate } from "./fullstack/index.js";
