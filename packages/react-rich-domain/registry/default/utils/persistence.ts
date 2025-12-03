import { Criteria } from "@woltz/rich-domain";

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

export function loadCriteriaFromStorage<T>(key: string): Criteria<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const json = JSON.parse(stored);
    return Criteria.fromObject<T>(json);
  } catch (error) {
    console.warn("Failed to load criteria from localStorage:", error);
    return null;
  }
}

export function removeCriteriaFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to remove criteria from localStorage:", error);
  }
}

export function criteriaToQueryParams<T>(
  criteria: Criteria<T>
): URLSearchParams {
  const params = new URLSearchParams();
  const json = criteria.toJSON();

  if (json.filters && json.filters.length > 0) {
    const filtersObj: Record<string, unknown> = {};
    for (const filter of json.filters) {
      let filterKey = `${filter.field}:${filter.operator}`;
      if (filter.options && filter.options.quantifier) {
        filterKey += `@${filter.options.quantifier}`;
      }
      let value: string | undefined;
      if (filter.value !== undefined) {
        if (Array.isArray(filter.value)) {
          value = JSON.stringify(filter.value);
        } else {
          value = String(filter.value);
        }
      } else {
        value = "";
      }
      filtersObj[filterKey] = value;
    }
    params.set("filters", JSON.stringify(filtersObj));
  }

  if (json.pagination) {
    params.set("page", String(json.pagination.page));
    params.set("limit", String(json.pagination.limit));
  }

  if (json.orders && json.orders.length > 0) {
    const sortValue = json.orders
      .map((order) => `${order.field}:${order.direction}`)
      .join(",");
    params.set("orderBy", sortValue);
  }

  if (json.search) {
    params.set("search", json.search.value);
    params.set("searchFields", json.search.fields.join(","));
  }

  return params;
}

export function syncCriteriaWithUrl<T>(criteria: Criteria<T>): void {
  if (typeof window === "undefined") return;

  const params = criteriaToQueryParams(criteria);
  const url = new URL(window.location.href);
  url.search = params.toString();

  window.history.replaceState({}, "", url.toString());
}

export function loadCriteriaFromUrl<T>(): Criteria<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const query: Record<string, unknown> = {};
    params.forEach((value, key) => {
      query[key] = value;
    });

    if (Object.keys(query).length === 0) return null;

    return Criteria.fromQueryParams<T>(query);
  } catch (error) {
    console.warn("Failed to load criteria from URL:", error);
    return null;
  }
}
