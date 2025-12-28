import { DomainEntity, DomainStructure, EntityType } from "../interfaces";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Box, Gem, Layers, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  domain: DomainStructure | null;
  loading: boolean;
  selectedEntity: string | null;
  onEntityClick: (entity: DomainEntity) => void;
}

const entityTypeConfig: Record<
  EntityType,
  { icon: any; label: string; color: string }
> = {
  aggregate: { icon: Box, label: "Aggregate", color: "text-primary" },
  entity: { icon: Layers, label: "Entity", color: "text-accent" },
  "value-object": { icon: Gem, label: "Value Object", color: "text-success" },
};

export default function Sidebar({
  domain,
  loading,
  selectedEntity,
  onEntityClick,
}: SidebarProps) {
  const [filterType, setFilterType] = useState<
    "all" | "aggregate" | "entity" | "value-object"
  >("all");

  if (loading) {
    return (
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!domain || domain.entities.length === 0) {
    return (
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <div className="text-sm text-gray-500">
          <p>No entities found.</p>
          <p className="mt-2">
            Make sure you have Rich Domain entities in your project.
          </p>
        </div>
      </div>
    );
  }

  // Group entities by type
  const grouped = domain.entities.reduce(
    (acc, entity) => {
      acc[entity.type].push(entity);
      return acc;
    },
    {
      aggregate: [] as DomainEntity[],
      entity: [] as DomainEntity[],
      "value-object": [] as DomainEntity[],
    }
  );

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-sidebar">
      <header className="flex flex-col gap-3 border-b border-sidebar-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            className="pl-9 bg-sidebar-accent border-sidebar-border"
          />
        </div>

        <div className="flex gap-1.5">
          <Button
            variant={filterType === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("all")}
            className="flex-1 text-xs"
          >
            All
          </Button>
          <Button
            variant={filterType === "entity" ? "secondary" : "ghost"}
            onClick={() => setFilterType("entity")}
            size="sm"
            className="flex-1 text-xs"
          >
            Ent
          </Button>
          <Button
            variant={filterType === "aggregate" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("aggregate")}
            className="flex-1 text-xs"
          >
            Agg
          </Button>
          <Button
            variant={filterType === "value-object" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("value-object")}
            className="flex-1 text-xs"
          >
            VO
          </Button>
        </div>
      </header>
      {/* Entity List */}
      <div className="flex-1 overflow-y-auto space-y-1 px-2 py-3">
        {/* Aggregates */}
        {grouped.aggregate.length > 0 && (
          <div className="space-y-1">
            {grouped.aggregate.map((entity) => (
              <EntityItem
                key={entity.name}
                entity={entity}
                isSelected={entity.name === selectedEntity}
                onEntityClick={onEntityClick}
              />
            ))}
          </div>
        )}

        {/* Entities */}
        {grouped.entity.length > 0 && (
          <div className="space-y-1">
            {grouped.entity.map((entity) => (
              <EntityItem
                key={entity.name}
                entity={entity}
                isSelected={entity.name === selectedEntity}
                onEntityClick={onEntityClick}
              />
            ))}
          </div>
        )}

        {/* Value Objects */}
        {grouped["value-object"].length > 0 && (
          <div className="space-y-1">
            {grouped["value-object"].map((entity) => (
              <EntityItem
                key={entity.name}
                entity={entity}
                isSelected={entity.name === selectedEntity}
                onEntityClick={onEntityClick}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function EntityItem({
  entity,
  isSelected,
  onEntityClick,
}: {
  entity: DomainEntity;
  isSelected: boolean;
  onEntityClick: (entity: DomainEntity) => void;
}) {
  const config = entityTypeConfig[entity.type];
  const Icon = config.icon;

  return (
    <button
      onClick={() => onEntityClick(entity)}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      <Icon className={cn("size-4 flex-shrink-0", config.color)} />
      <span className="flex-1 truncate font-medium font-mono">
        {entity.name}
      </span>
    </button>
  );
}
