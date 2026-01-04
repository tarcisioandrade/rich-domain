"use client";

import { useCriteria } from "../../hooks/use-criteria";
import { Sorting, type SortingField } from "./sorting";

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: string;
}

const sortingFields: SortingField[] = [
  {
    field: "name",
    fieldLabel: "Name",
  },
  {
    field: "email",
    fieldLabel: "Email",
  },
  {
    field: "age",
    fieldLabel: "Age",
  },
  {
    field: "status",
    fieldLabel: "Status",
  },
];

export function SortingExample() {
  const criteria = useCriteria<User>({
    pageSize: 10,
    initialSort: [{ field: "name", direction: "asc" }],
    syncWithUrl: true,
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sorting fields={sortingFields} criteria={criteria} />
      </div>

      <div className="p-4 border rounded-md">
        <h3 className="font-semibold mb-2">Current Sorting:</h3>
        <pre className="text-sm">
          {JSON.stringify(criteria.sorting, null, 2)}
        </pre>
      </div>

      <div className="p-4 border rounded-md">
        <h3 className="font-semibold mb-2">Criteria JSON:</h3>
        <pre className="text-sm">
          {JSON.stringify(criteria.toJSON(), null, 2)}
        </pre>
      </div>
    </div>
  );
}
