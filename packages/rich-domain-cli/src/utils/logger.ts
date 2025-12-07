import pc from "picocolors";

/**
 * Logger utility for CLI output with colors and formatting
 */
export const logger = {
  /**
   * Log info message
   */
  info(message: string): void {
    console.log(pc.blue("ℹ"), message);
  },

  /**
   * Log success message
   */
  success(message: string): void {
    console.log(pc.green("✓"), message);
  },

  /**
   * Log warning message
   */
  warn(message: string): void {
    console.log(pc.yellow("⚠"), message);
  },

  /**
   * Log error message
   */
  error(message: string): void {
    console.log(pc.red("✗"), message);
  },

  /**
   * Log a step in a process
   */
  step(message: string): void {
    console.log(pc.cyan("→"), message);
  },

  /**
   * Log a dim/secondary message
   */
  dim(message: string): void {
    console.log(pc.dim(message));
  },

  /**
   * Log with custom prefix
   */
  log(prefix: string, message: string): void {
    console.log(prefix, message);
  },

  /**
   * Log an empty line
   */
  newLine(): void {
    console.log();
  },

  /**
   * Log a header/title
   */
  header(title: string): void {
    console.log();
    console.log(pc.bold(pc.cyan(title)));
    console.log(pc.dim("─".repeat(title.length + 4)));
  },

  /**
   * Log a list item
   */
  listItem(text: string, indent = 0): void {
    const spaces = "  ".repeat(indent);
    console.log(`${spaces}${pc.dim("•")} ${text}`);
  },

  /**
   * Log a file path (highlighted)
   */
  file(action: "created" | "updated" | "skipped", path: string): void {
    const icons = {
      created: pc.green("✓"),
      updated: pc.yellow("↻"),
      skipped: pc.dim("○"),
    };
    const colors = {
      created: pc.green,
      updated: pc.yellow,
      skipped: pc.dim,
    };
    console.log(`  ${icons[action]} ${colors[action](path)}`);
  },

  /**
   * Log a boxed message
   */
  box(lines: string[]): void {
    const maxLength = Math.max(...lines.map((l) => l.length));
    const border = "─".repeat(maxLength + 2);

    console.log(pc.dim(`┌${border}┐`));
    for (const line of lines) {
      const padding = " ".repeat(maxLength - line.length);
      console.log(pc.dim("│"), line + padding, pc.dim("│"));
    }
    console.log(pc.dim(`└${border}┘`));
  },

  /**
   * Format a count with label
   */
  count(count: number, singular: string, plural?: string): string {
    const label = count === 1 ? singular : (plural ?? `${singular}s`);
    return `${pc.bold(String(count))} ${label}`;
  },
};

/**
 * Create a styled string for command examples
 */
export function command(cmd: string): string {
  return pc.cyan(`$ ${cmd}`);
}

/**
 * Create a styled string for code/values
 */
export function code(value: string): string {
  return pc.yellow(value);
}

/**
 * Create a styled string for paths
 */
export function path(value: string): string {
  return pc.underline(value);
}
