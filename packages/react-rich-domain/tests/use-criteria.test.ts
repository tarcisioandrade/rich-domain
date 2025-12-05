import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useCriteria } from "../registry/default/hooks/use-criteria";

interface TestUser {
  id: string;
  name: string;
  email: string;
  age: number;
  status: "active" | "inactive";
}

describe("useCriteria", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Initialization", () => {
    it("should create criteria with default values", () => {
      const { result } = renderHook(() => useCriteria<TestUser>());

      expect(result.current.filters).toHaveLength(0);
      expect(result.current.sorting).toHaveLength(0);
      expect(result.current.pagination.page).toBe(1);
      expect(result.current.pagination.limit).toBe(20);
      expect(result.current.search).toBeNull();
    });

    it("should create criteria with custom page size", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          pageSize: 10,
        })
      );

      expect(result.current.pagination.limit).toBe(10);
    });

    it("should create criteria with initial filters", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialFilters: [
            { field: "status", operator: "equals", value: "active" },
            { field: "age", operator: "greaterThan", value: 18 },
          ],
        })
      );

      expect(result.current.filters).toHaveLength(2);
      expect(result.current.filters[0].field).toBe("status");
      expect(result.current.filters[0].operator).toBe("equals");
      expect(result.current.filters[0].value).toBe("active");
    });

    it("should create criteria with initial sorting", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialSort: [
            { field: "name", direction: "asc" },
            { field: "age", direction: "desc" },
          ],
        })
      );

      expect(result.current.sorting).toHaveLength(2);
      expect(result.current.sorting[0].field).toBe("name");
      expect(result.current.sorting[0].direction).toBe("asc");
    });

    it("should create criteria with initial search", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialSearch: "john",
        })
      );

      expect(result.current.search).not.toBeNull();
      expect(result.current.search).toBe("john");
    });
  });

  describe("Filter Operations", () => {
    it("should add a filter", () => {
      const { result } = renderHook(() => useCriteria<TestUser>());

      act(() => {
        result.current.addFilter("status", "equals", "active");
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].field).toBe("status");
      expect(result.current.filters[0].value).toBe("active");
    });

    it("should add multiple filters", () => {
      const { result } = renderHook(() => useCriteria<TestUser>());

      act(() => {
        result.current.addFilter("status", "equals", "active");
        result.current.addFilter("age", "greaterThan", 18);
      });

      expect(result.current.filters).toHaveLength(2);
    });

    it("should remove a filter by index", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialFilters: [
            { field: "status", operator: "equals", value: "active" },
            { field: "age", operator: "greaterThan", value: 18 },
          ],
        })
      );

      act(() => {
        result.current.removeFilter(0);
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].field).toBe("age");
    });

    it("should clear all filters", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialFilters: [
            { field: "status", operator: "equals", value: "active" },
            { field: "age", operator: "greaterThan", value: 18 },
          ],
        })
      );

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toHaveLength(0);
    });
  });

  describe("Sorting Operations", () => {
    it("should add sorting", () => {
      const { result } = renderHook(() => useCriteria<TestUser>());

      act(() => {
        result.current.addSort("name", "asc");
      });

      expect(result.current.sorting).toHaveLength(1);
      expect(result.current.sorting[0].field).toBe("name");
      expect(result.current.sorting[0].direction).toBe("asc");
    });

    it("should remove sort by index", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialSort: [
            { field: "name", direction: "asc" },
            { field: "age", direction: "desc" },
          ],
        })
      );

      act(() => {
        result.current.removeSort(0);
      });

      expect(result.current.sorting).toHaveLength(1);
      expect(result.current.sorting[0].field).toBe("age");
    });

    it("should clear all sorting", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialSort: [{ field: "name", direction: "asc" }],
        })
      );

      act(() => {
        result.current.clearSort();
      });

      expect(result.current.sorting).toHaveLength(0);
    });
  });

  describe("Pagination Operations", () => {
    it("should set page", () => {
      const { result } = renderHook(() => useCriteria<TestUser>());

      act(() => {
        result.current.setPage(3);
      });

      expect(result.current.pagination.page).toBe(3);
    });

    it("should set page size and reset to page 1", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({ initialPage: 5 })
      );

      act(() => {
        result.current.setPageSize(50);
      });

      expect(result.current.pagination.limit).toBe(50);
      expect(result.current.pagination.page).toBe(1);
    });

    it("should go to next page", () => {
      const { result } = renderHook(() => useCriteria<TestUser>());

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.pagination.page).toBe(2);
    });

    it("should go to previous page", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({ initialPage: 3 })
      );

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.pagination.page).toBe(2);
    });

    it("should not go below page 1", () => {
      const { result } = renderHook(() => useCriteria<TestUser>());

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.pagination.page).toBe(1);
    });
  });

  describe("Search Operations", () => {
    it("should set search", () => {
      const { result } = renderHook(() => useCriteria<TestUser>());

      act(() => {
        result.current.setSearch("john");
      });

      expect(result.current.search).not.toBeNull();
      expect(result.current.search).toBe("john");
    });

    it("should clear search", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialSearch: "test",
        })
      );

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.search).toBeNull();
    });
  });

  describe("Persistence", () => {
    it("should persist to localStorage when persistKey is provided", () => {
      const persistKey = "test-criteria";
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          persistKey,
        })
      );

      act(() => {
        result.current.addFilter("status", "equals", "active");
      });

      const stored = localStorage.getItem(persistKey);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.filters).toHaveLength(1);
    });

    it("should load from localStorage on mount", () => {
      const persistKey = "test-criteria";

      const { result: result1, unmount } = renderHook(() =>
        useCriteria<TestUser>({
          persistKey,
        })
      );

      act(() => {
        result1.current.addFilter("status", "equals", "active");
        result1.current.setPage(3);
      });

      unmount();

      // Second render - should load from storage
      const { result: result2 } = renderHook(() =>
        useCriteria<TestUser>({
          persistKey,
        })
      );

      expect(result2.current.filters).toHaveLength(1);
      expect(result2.current.pagination.page).toBe(3);
    });
  });

  describe("Utilities", () => {
    it("should reset to initial state", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialFilters: [
            { field: "status", operator: "equals", value: "active" },
          ],
          pageSize: 10,
        })
      );

      act(() => {
        result.current.addFilter("age", "greaterThan", 18);
        result.current.setPage(5);
      });

      expect(result.current.filters).toHaveLength(2);
      expect(result.current.pagination.page).toBe(5);

      act(() => {
        result.current.reset();
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.pagination.page).toBe(1);
    });

    it("should export criteria as JSON", () => {
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          initialFilters: [
            { field: "status", operator: "equals", value: "active" },
          ],
        })
      );

      const json = result.current.toJSON();

      expect(json.filters).toHaveLength(1);
      expect(json.pagination).toBeDefined();
    });

    it("should clone criteria", () => {
      const { result } = renderHook(() => useCriteria<TestUser>());

      act(() => {
        result.current.addFilter("status", "equals", "active");
      });

      const cloned = result.current.clone();

      expect(cloned.getFilters()).toHaveLength(1);
      expect(cloned).not.toBe(result.current.criteria);
    });
  });

  describe("onChange callback", () => {
    it("should call onChange when criteria changes", () => {
      let callCount = 0;
      const { result } = renderHook(() =>
        useCriteria<TestUser>({
          onChange: () => {
            callCount++;
          },
        })
      );

      act(() => {
        result.current.addFilter("status", "equals", "active");
      });

      expect(callCount).toBeGreaterThan(0);
    });
  });
});
