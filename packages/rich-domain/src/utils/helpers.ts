export function parseQueryValue(value: string): any {
  if (!isNaN(Number(value))) return Number(value); // number
  if (value === "true" || value === "false") return value === "true"; // boolean
  if (!isNaN(Date.parse(value))) return new Date(value); // Date
  return value; // string
}
