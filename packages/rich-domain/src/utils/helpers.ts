export function parseQueryValue(value: unknown): any {
  if (value === null || value === undefined) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value;

  const str = String(value);
  if (str === "true" || str === "false") return str === "true";
  if (str.trim() !== "" && !isNaN(Number(str))) return Number(str);
  if (!isNaN(Date.parse(str))) return new Date(str);

  return str;
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function getStaticProperty<T>(
  instance: any,
  propertyName: string
): T | undefined {
  return instance.constructor[propertyName];
}
