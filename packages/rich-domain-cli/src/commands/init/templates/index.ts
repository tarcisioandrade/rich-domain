import { BaseTemplate, TemplateMetadata } from "./base.template.js";
import { FullstackPrismaTemplate } from "./fullstack-prisma/index.js";
import { FullstackDrizzleTemplate } from "./fullstack-drizzle/index.js";
import { FullstackTypeORMTemplate } from "./fullstack-typeorm/index.js";

/**
 * Registry of all available templates
 */
export class TemplateRegistry {
  private templates: Map<string, BaseTemplate> = new Map();

  constructor() {
    this.register(new FullstackPrismaTemplate());
    this.register(new FullstackDrizzleTemplate());
    this.register(new FullstackTypeORMTemplate());
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
export { FullstackPrismaTemplate } from "./fullstack-prisma/index.js";
export { FullstackDrizzleTemplate } from "./fullstack-drizzle/index.js";
export { FullstackTypeORMTemplate } from "./fullstack-typeorm/index.js";
