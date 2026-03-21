import { Criteria } from "@woltz/rich-domain";

export function saveCriteriaToStorage<T>(
	key: string,
	criteria: Criteria<T>,
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

export function syncCriteriaWithUrl<T>(criteria: Criteria<T>): void {
	if (typeof window === "undefined") return;

	const params = criteria.toQueryParams();
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
