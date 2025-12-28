import { DomainEntity, DomainStructure, EntityType } from "../interfaces";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Box, Gem, Layers, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

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
  entity: { icon: Layers, label: "Entity", color: "text-blue-400" },
  "value-object": {
    icon: Gem,
    label: "Value Object",
    color: "text-emerald-400",
  },
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
  const [searchTerm, setSearchTerm] = useState("");

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

  // Filter entities based on search term and type filter
  const filteredEntities = domain.entities.filter((entity) => {
    // Filter by type
    const matchesType = filterType === "all" || entity.type === filterType;

    // Filter by search term (case insensitive)
    const matchesSearch =
      searchTerm.trim() === "" ||
      entity.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesSearch;
  });

  // Group filtered entities by type
  const grouped = filteredEntities.reduce(
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

  // Check if there are any filtered results
  const hasResults = filteredEntities.length > 0;

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-sidebar">
      <header className="flex flex-col gap-3 border-b border-sidebar-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            className="pl-9 bg-sidebar-accent border-sidebar-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
        {!hasResults ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm text-muted-foreground mb-1">
              No entities found
            </p>
            <p className="text-xs text-muted-foreground/70">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <>
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
          </>
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
