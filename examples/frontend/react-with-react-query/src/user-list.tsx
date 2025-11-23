import { getUsers, type TestUser } from "./service/get-users";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useCriteria } from "./hooks/use-criteria";

export function UserList() {
  const {
    criteria,
    filters,
    sorting,
    pagination,
    search,
    addFilter,
    removeFilter,
    clearFilters,
    addSort,
    reset,
    setPageSize,
    nextPage,
    prevPage,
    setSearch,
    clearSearch,
  } = useCriteria<TestUser>({
    pageSize: 10,
    initialFilters: [{ field: "status", operator: "equals", value: "active" }],
    persistKey: "user-list-criteria",
    onChange: (criteria) => {
      console.log("Criteria changed:", criteria.toJSON());
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["users", criteria.toJSON()],
    queryFn: () => getUsers(criteria),
  });

  const [searchValue, setSearchValue] = useState("");

  const handleSearch = () => {
    if (searchValue.trim()) {
      setSearch(["name"], searchValue);
    } else {
      clearSearch();
    }
  };

  const handleAgeFilter = () => {
    addFilter("age", "greaterThan", 18);
  };

  return (
    <div className="user-list">
      <h1>User List</h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
        {search && (
          <button onClick={clearSearch}>
            Clear Search (searching: "{search.value}")
          </button>
        )}
      </div>

      <div className="filters">
        <h3>Filters</h3>
        <button onClick={() => addFilter("status", "equals", "active")}>
          Active Users
        </button>
        <button onClick={() => addFilter("status", "equals", "inactive")}>
          Inactive Users
        </button>
        <button onClick={handleAgeFilter}>Age &gt; 18</button>
        <button onClick={clearFilters}>Clear All Filters</button>
        <button onClick={reset}>Initial State</button>

        <div className="active-filters">
          <strong>Active Filters: {filters.length}</strong>
          {filters.map((filter, index) => (
            <div key={index} className="filter-badge">
              {String(filter.field)} {filter.operator} {String(filter.value)}
              <button onClick={() => removeFilter(index)}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="sorting">
        <h3>Sort By</h3>
        <button onClick={() => addSort("name", "asc")}>Name (A-Z)</button>
        <button onClick={() => addSort("name", "desc")}>Name (Z-A)</button>
        <button onClick={() => addSort("age", "asc")}>Age (Low to High)</button>

        <div className="active-sorts">
          <strong>Active Sorts: {sorting.length}</strong>
          {sorting.map((sort, index) => (
            <div key={index} className="sort-badge">
              {String(sort.field)} ({sort.direction})
            </div>
          ))}
        </div>
      </div>

      <div className="data-table">
        <p>Current Criteria:</p>
        <pre>{JSON.stringify(criteria.toJSON(), null, 2)}</pre>
        {isLoading && <p>Loading...</p>}
        {data?.data.map((user) => (
          <ul key={user.id}>
            <li>{user.name}</li>
            <li>{user.age}</li>
            <li>{user.status}</li>
          </ul>
        ))}
        {error && <p>Error: {error.message}</p>}
        {data?.data.length === 0 && <p>No users found</p>}
      </div>

      <div className="pagination">
        <button disabled={!data?.meta.hasPrevious} onClick={prevPage}>
          Previous
        </button>
        <span>
          Page {pagination.page} | Per page: {pagination.limit}
        </span>
        <button disabled={!data?.meta.hasNext} onClick={nextPage}>
          Next
        </button>

        <select
          value={pagination.limit}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>
    </div>
  );
}
