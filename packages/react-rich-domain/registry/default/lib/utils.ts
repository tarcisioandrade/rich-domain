import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const query: Record<string, unknown> = {};
  params.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}
