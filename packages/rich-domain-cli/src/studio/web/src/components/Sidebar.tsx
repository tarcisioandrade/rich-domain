import { DomainEntity, DomainStructure } from "../interfaces";

interface SidebarProps {
  domain: DomainStructure | null;
  loading: boolean;
  onEntityClick: (entity: DomainEntity) => void;
}

const typeColors = {
  entity: "text-blue-400",
  aggregate: "text-purple-400",
  "value-object": "text-green-400",
};

export default function Sidebar({
  domain,
  loading,
  onEntityClick,
}: SidebarProps) {
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
        <h2 className="text-lg font-semibold mb-4 text-gray-300">
          Domain Explorer
        </h2>
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
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-300">Domain Explorer</h2>
        <p className="text-xs text-gray-500 mt-1">
          {domain.entities.length} entities • {domain.totalFiles} files
        </p>
      </div>

      {/* Entity List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Aggregates */}
        {grouped.aggregate.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              🎯 Aggregates
            </h3>
            <div className="space-y-1">
              {grouped.aggregate.map((entity) => (
                <EntityItem
                  key={entity.name}
                  entity={entity}
                  onEntityClick={onEntityClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Entities */}
        {grouped.entity.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              📦 Entities
            </h3>
            <div className="space-y-1">
              {grouped.entity.map((entity) => (
                <EntityItem
                  key={entity.name}
                  entity={entity}
                  onEntityClick={onEntityClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Value Objects */}
        {grouped["value-object"].length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              💎 Value Objects
            </h3>
            <div className="space-y-1">
              {grouped["value-object"].map((entity) => (
                <EntityItem
                  key={entity.name}
                  entity={entity}
                  onEntityClick={onEntityClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EntityItem({
  entity,
  onEntityClick,
}: {
  entity: DomainEntity;
  onEntityClick: (entity: DomainEntity) => void;
}) {
  return (
    <div
      role="button"
      className="group hover:bg-gray-700 rounded p-2 cursor-pointer transition-colors"
      onClick={() => onEntityClick(entity)}
    >
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${typeColors[entity.type]}`}>
          {entity.name}
        </span>
      </div>
      {entity.methods.length > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          {entity.methods.slice(0, 3).join(", ")}
          {entity.methods.length > 3 && `, +${entity.methods.length - 3} more`}
        </div>
      )}
    </div>
  );
}
