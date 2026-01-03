"use client";

import { useCriteriaTimeline } from "./hooks/use-criteria-timeline";
import { DataTimelineCriteria } from "./components/data-timeline-criteria/data-timeline-criteria";
import type { QueryFilter } from "./lib/filter-utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Mail, Calendar, CircleX, CircleCheck } from "lucide-react";
import { format } from "date-fns";
import { getUsers, type TestUser } from "./service/get-users";

const filterFields: QueryFilter[] = [
  {
    type: "string",
    field: "status",
    fieldLabel: "Status",
    multiSelect: true,
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  },
  {
    type: "string",
    field: "name",
    fieldLabel: "Name",
  },
  {
    type: "number",
    field: "age",
    fieldLabel: "Age",
  },
  {
    type: "date",
    field: "createdAt",
    fieldLabel: "Created At",
  },
];

export function UserTimeline() {
  const timeline = useCriteriaTimeline<TestUser>(
    ["users", "timeline"],
    getUsers,
    {
      dateField: "createdAt",
      groupBy: "year",
      sortDirection: "desc",
      filterFields,
      syncWithUrl: true,
    }
  );

  return (
    <div className="max-w-lg mx-auto py-8">
      <DataTimelineCriteria
        timeline={timeline}
        searchPlaceholder="Search users..."
        emptyMessage="No user activity found."
        getIcon={(item) => {
          if (item.status === "inactive") {
            return <CircleX className="h-4 w-4" />;
          } else if (item.status === "active") {
            return <CircleCheck className="h-4 w-4" />;
          }
          return null;
        }}
        renderEvent={(user) => (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {user.name}
                    {user.status === "active" && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}{" "}
                    {user.age}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {user.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(user.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
      />
    </div>
  );
}
