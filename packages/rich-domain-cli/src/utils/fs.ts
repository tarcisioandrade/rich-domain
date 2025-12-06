import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write a file, creating parent directories if needed
 */
export function writeFile(filePath: string, content: string): void {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, "utf-8");
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Read file contents
 */
export function readFile(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

/**
 * Resolve path relative to current working directory
 */
export function resolvePath(...paths: string[]): string {
  return resolve(process.cwd(), ...paths);
}

/**
 * Join paths
 */
export function joinPath(...paths: string[]): string {
  return join(...paths);
}

/**
 * Find Prisma schema file in common locations
 */
export function findPrismaSchema(): string | null {
  const commonPaths = [
    "prisma/schema.prisma",
    "schema.prisma",
    "src/prisma/schema.prisma",
    "database/schema.prisma",
  ];

  for (const schemaPath of commonPaths) {
    const fullPath = resolvePath(schemaPath);
    if (fileExists(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Get relative path from cwd
 */
export function relativePath(absolutePath: string): string {
  const cwd = process.cwd();
  if (absolutePath.startsWith(cwd)) {
    return absolutePath.slice(cwd.length + 1);
  }
  return absolutePath;
}
