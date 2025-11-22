import { Criteria } from "@woltz/rich-domain";

/**
 * Save criteria to localStorage
 */
export function saveCriteriaToStorage<T>(
  key: string,
  criteria: Criteria<T>
): void {
  try {
    const json = criteria.toJSON();
    localStorage.setItem(key, JSON.stringify(json));
  } catch (error) {
    console.warn("Failed to save criteria to localStorage:", error);
  }
}

/**
 * Load criteria from localStorage
 */
export function loadCriteriaFromStorage<T>(key: string): Criteria<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const json = JSON.parse(stored);
    // Dynamically import to avoid circular dependency
    const { Criteria } = require("@woltz/rich-domain");
    // @ts-ignore
    return Criteria.fromObject<T>(json);
  } catch (error) {
    console.warn("Failed to load criteria from localStorage:", error);
    return null;
  }
}

/**
 * Remove criteria from localStorage
 */
export function removeCriteriaFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to remove criteria from localStorage:", error);
  }
}

/**
 * Convert criteria to URL query params
 */
export function criteriaToQueryParams<T>(
  criteria: Criteria<T>
): URLSearchParams {
  const params = new URLSearchParams();
  const json = criteria.toJSON();

  // Add filters
  json.filters?.forEach((filter) => {
    const key = `${filter.field}:${filter.operator}`;
    if (filter.value !== undefined) {
      if (Array.isArray(filter.value)) {
        params.set(key, filter.value.join(","));
      } else {
        params.set(key, String(filter.value));
      }
    } else {
      params.set(key, "");
    }
  });

  // Add pagination
  if (json.pagination) {
    params.set("page", String(json.pagination.page));
    params.set("limit", String(json.pagination.limit));
  }

  // Add sorting
  if (json.orders && json.orders.length > 0) {
    const sortValue = json.orders
      .map((order) => `${order.field}:${order.direction}`)
      .join(",");
    params.set("orderBy", sortValue);
  }

  // Add search
  if (json.search) {
    params.set("search", json.search.value);
    params.set("searchFields", json.search.fields.join(","));
  }

  return params;
}

/**
 * Update URL with criteria query params
 */
export function syncCriteriaWithUrl<T>(criteria: Criteria<T>): void {
  if (typeof window === "undefined") return;

  const params = criteriaToQueryParams(criteria);
  const url = new URL(window.location.href);
  url.search = params.toString();

  window.history.replaceState({}, "", url.toString());
}

/**
 * Load criteria from URL query params
 */
export function loadCriteriaFromUrl<T>(): Criteria<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const query: Record<string, any> = {};

    params.forEach((value, key) => {
      query[key] = value;
    });

    if (Object.keys(query).length === 0) return null;

    // Dynamically import to avoid circular dependency
    const { Criteria } = require("@woltz/rich-domain");
    // @ts-ignore
    return Criteria.fromQueryParams<T>(query);
  } catch (error) {
    console.warn("Failed to load criteria from URL:", error);
    return null;
  }
}
