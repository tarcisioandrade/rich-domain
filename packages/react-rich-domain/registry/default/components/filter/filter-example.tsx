"use client";

import { Filter } from "./filter";
import { useCriteria } from "@/hooks/use-criteria";
import type { QueryFilter } from "@/lib/filter-types";

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  status: "active" | "inactive" | "pending";
  createdAt: Date;
  isVerified: boolean;
}

export function UserFilterExample() {
  const { filters, addOrReplaceByIndex, removeFilter, clearFilters } =
    useCriteria<User>({
      syncWithUrl: true,
    });

  const filterFields: QueryFilter[] = [
    {
      type: "string",
      field: "name",
      fieldLabel: "Name",
    },
    {
      type: "string",
      field: "email",
      fieldLabel: "Email",
    },
    {
      type: "number",
      field: "age",
      fieldLabel: "Age",
    },
    {
      type: "string",
      field: "status",
      fieldLabel: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Pending", value: "pending" },
      ],
    },
    {
      type: "date",
      field: "createdAt",
      fieldLabel: "Created At",
    },
    {
      type: "boolean",
      field: "isVerified",
      fieldLabel: "Is Verified",
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">User Filters</h2>

      <Filter
        fields={filterFields}
        filters={filters}
        addOrReplaceByIndex={addOrReplaceByIndex}
        removeFilter={removeFilter}
        clearFilters={clearFilters}
      />

      {/* Display current filters for debugging */}
      <div className="mt-4">
        <h3 className="text-sm font-medium">Current Filters:</h3>
        <pre className="mt-2 rounded-md bg-slate-950 p-4 text-sm">
          {JSON.stringify(filters, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/**
 * Example with nested fields
 */
interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
  };
  amount: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  createdAt: Date;
}

export function OrderFilterExample() {
  const { filters, addOrReplaceByIndex, removeFilter, clearFilters } =
    useCriteria<Order>();

  const filterFields: QueryFilter[] = [
    {
      type: "string",
      field: "orderNumber",
      fieldLabel: "Order Number",
    },
    {
      type: "string",
      field: "customer.name",
      fieldLabel: "Customer Name",
    },
    {
      type: "string",
      field: "customer.email",
      fieldLabel: "Customer Email",
    },
    {
      type: "number",
      field: "amount",
      fieldLabel: "Amount",
    },
    {
      type: "string",
      field: "status",
      fieldLabel: "Status",
      multiSelect: true,
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
    {
      type: "date",
      field: "createdAt",
      fieldLabel: "Created At",
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">
        Order Filters (with nested fields)
      </h2>

      <Filter
        fields={filterFields}
        filters={filters}
        addOrReplaceByIndex={addOrReplaceByIndex}
        removeFilter={removeFilter}
        clearFilters={clearFilters}
      />

      <div className="mt-4">
        <h3 className="text-sm font-medium">Current Filters:</h3>
        <pre className="mt-2 rounded-md bg-slate-950 p-4 text-sm">
          {JSON.stringify(filters, null, 2)}
        </pre>
      </div>
    </div>
  );
}
