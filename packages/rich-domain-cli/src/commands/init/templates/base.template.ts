/**
 * Base interface for all templates
 */
export interface TemplateFile {
  path: string;
  content: string;
}

export interface TemplateOptions {
  projectName: string;
  targetDir: string;
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
}

export interface TemplateMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  tags: string[];
}

/**
 * Abstract base class for templates
 * Extend this to create new templates
 */
export abstract class BaseTemplate {
  abstract readonly metadata: TemplateMetadata;

  /**
   * Generate all files for this template
   */
  abstract generate(options: TemplateOptions): Promise<TemplateFile[]>;

  /**
   * Get dependencies to install
   */
  abstract getDependencies(): Record<string, string>;

  /**
   * Get dev dependencies to install
   */
  abstract getDevDependencies(): Record<string, string>;

  /**
   * Post-install instructions to show the user
   */
  abstract getPostInstallInstructions(options: TemplateOptions): string[];

  /**
   * Generate package.json
   */
  protected generatePackageJson(options: TemplateOptions): TemplateFile {
    const pkg = {
      name: options.projectName,
      version: "0.0.1",
      type: "module",
      scripts: this.getScripts(),
      dependencies: this.getDependencies(),
      devDependencies: this.getDevDependencies(),
    };

    return {
      path: "package.json",
      content: JSON.stringify(pkg, null, 2),
    };
  }

  /**
   * Get npm scripts
   */
  protected abstract getScripts(): Record<string, string>;
}
