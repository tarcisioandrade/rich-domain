import { useCallback, useMemo, useState, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  Position,
  ReactFlowProvider,
  Handle,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { DomainEntity } from "../interfaces";
import { Box, Gem, Layers, Info } from "lucide-react";
import ContextSidebar from "./ContextSidebar";
import EntityDetailDrawer from "./EntityDetailDrawer";
import { Tooltip } from "./Tooltip";

interface EntityDiagramProps {
  entities: DomainEntity[];
  contexts: string[];
  onEntityClick?: (entity: DomainEntity) => void;
}

// Custom node component for entities
function EntityNode({ data }: { data: any }) {
  const IconComponent = data.icon;
  const iconColor = data.iconColor;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-card min-w-[180px] cursor-pointer transition-all hover:shadow-lg ${
        data.isAggregate
          ? "border-primary"
          : data.isValueObject
          ? "border-emerald-500"
          : "border-blue-500"
      }`}
      onClick={data.onClick}
    >
      {/* Target handle (where edges can connect TO this node) - hidden but functional */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0 }}
        isConnectable={false}
      />

      <div className="flex items-center gap-2 mb-2">
        <IconComponent className={`size-4 ${iconColor}`} />
        <div className="font-semibold font-mono text-sm">{data.label}</div>
      </div>
      <div className="text-xs text-muted-foreground">
        {data.propertyCount}{" "}
        {data.propertyCount === 1 ? "property" : "properties"}
      </div>
      {data.relationshipCount > 0 && (
        <div className="text-xs text-muted-foreground">
          {data.relationshipCount}{" "}
          {data.relationshipCount === 1 ? "relationship" : "relationships"}
        </div>
      )}

      {/* Source handle (where edges can connect FROM this node) - hidden but functional */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0 }}
        isConnectable={false}
      />
    </div>
  );
}

const nodeTypes = {
  entity: EntityNode,
};

// Auto-layout using Dagre
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 200;
  const nodeHeight = 100;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      targetPosition: direction === "TB" ? Position.Top : Position.Left,
      sourcePosition: direction === "TB" ? Position.Bottom : Position.Right,
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Internal component that uses React Flow hooks
function EntityDiagramFlow({ entities, contexts }: EntityDiagramProps) {
  const { fitView } = useReactFlow();
  const [selectedContext, setSelectedContext] = useState<string | null>(
    contexts.length > 0 ? contexts[0] : null
  );
  const [selectedEntity, setSelectedEntity] = useState<DomainEntity | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Update selected context when contexts change
  useEffect(() => {
    if (contexts.length > 0 && !selectedContext) {
      setSelectedContext(contexts[0]);
    }
  }, [contexts, selectedContext]);

  // Filter entities by selected context
  const filteredEntities = useMemo(() => {
    if (!selectedContext) return entities;
    return entities.filter((e) => e.context === selectedContext);
  }, [entities, selectedContext]);

  // Build nodes from filtered entities + cross-context referenced entities
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    const addedNodes = new Set<string>();

    // Helper to create node
    const createNode = (entity: DomainEntity, isGhost: boolean = false) => {
      let icon = Layers;
      let iconColor = "text-blue-400";

      if (entity.type === "aggregate") {
        icon = Box;
        iconColor = "text-primary";
      } else if (entity.type === "value-object") {
        icon = Gem;
        iconColor = "text-emerald-400";
      }

      return {
        id: entity.name,
        type: "entity",
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          label: entity.name,
          icon,
          iconColor,
          propertyCount: entity.properties.length,
          relationshipCount: entity.relationships.length,
          isAggregate: entity.type === "aggregate",
          isValueObject: entity.type === "value-object",
          onClick: () => {
            setSelectedEntity(entity);
            setDrawerOpen(true);
          },
        },
        style: isGhost
          ? {
              opacity: 0.5,
              border: "2px dashed #666",
            }
          : undefined,
      };
    };

    // Add main filtered entities
    filteredEntities.forEach((entity) => {
      nodes.push(createNode(entity));
      addedNodes.add(entity.name);
    });

    // Add cross-context referenced entities as ghost nodes
    filteredEntities.forEach((entity) => {
      entity.relationships.forEach((rel) => {
        const targetEntity = entities.find((e) => e.name === rel.toEntity);
        if (
          targetEntity &&
          targetEntity.context !== entity.context &&
          !addedNodes.has(targetEntity.name)
        ) {
          nodes.push(createNode(targetEntity, true));
          addedNodes.add(targetEntity.name);
        }
      });
    });

    return nodes;
  }, [filteredEntities, entities]);

  // Build edges from relationships
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    filteredEntities.forEach((entity) => {
      entity.relationships.forEach((rel) => {
        const targetEntity = entities.find((e) => e.name === rel.toEntity);

        // Skip if target entity doesn't exist
        if (!targetEntity) return;

        const edgeId = `${rel.fromEntity}-${rel.toEntity}-${rel.propertyName}`;

        // Determine if cross-context
        const isCrossContext = entity.context !== targetEntity.context;

        // Style based on relationship type
        let strokeColor = "#64748b"; // default slate-500
        let strokeDasharray = undefined;

        if (isCrossContext) {
          // Cross-context relationships
          strokeColor = "#ef4444"; // red-500
        } else if (rel.relationshipType === "composition") {
          strokeColor = "#10b981"; // emerald-500
        } else if (rel.relationshipType === "reference") {
          strokeColor = "#3b82f6"; // blue-500
          strokeDasharray = "5,5";
        } else if (rel.relationshipType === "aggregation") {
          strokeColor = "#a855f7"; // purple-500
          strokeDasharray = "2,2";
        }

        // Create edge with styling
        edges.push({
          id: edgeId,
          source: rel.fromEntity,
          target: rel.toEntity,
          type: "smoothstep",
          animated: false,
          label: rel.propertyName,
          labelStyle: {
            fontSize: 10,
            fill: strokeColor,
            fontWeight: 500,
          },
          labelBgStyle: {
            fill: "hsl(var(--background))",
            fillOpacity: 0.8,
          },
          style: {
            stroke: strokeColor,
            strokeWidth: 2,
            strokeDasharray,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 20,
            height: 20,
          },
        });
      });
    });

    return edges;
  }, [filteredEntities, entities]);

  // Apply auto-layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    const result = getLayoutedElements(initialNodes, initialEdges);

    return {
      nodes: result.nodes,
      edges: initialEdges,
    };
  }, [initialNodes, initialEdges]);

  // Use React Flow state hooks for interactive nodes
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(layoutedEdges);

  // Filter edge changes to prevent deletion
  const onEdgesChange = useCallback(
    (changes: any[]) => {
      // Filter out 'remove' changes to prevent edge deletion
      const filteredChanges = changes.filter(
        (change) => change.type !== "remove"
      );
      onEdgesChangeInternal(filteredChanges);
    },
    [onEdgesChangeInternal]
  );

  // Update nodes and edges when layout changes
  useEffect(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  useEffect(() => {
    setEdges(layoutedEdges);
  }, [layoutedEdges, setEdges]);

  // Fit view only when context changes or initial load
  useEffect(() => {
    if (nodes.length > 0) {
      // Small timeout to ensure nodes are rendered
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 200 });
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContext, nodes.length, fitView]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const entity = filteredEntities.find((e) => e.name === node.id);
      if (entity) {
        setSelectedEntity(entity);
        setDrawerOpen(true);
      }
    },
    [filteredEntities]
  );

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedEntity(null);
  }, []);

  if (entities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">No entities found</p>
          <p className="text-sm">
            Make sure you have Rich Domain entities in your project
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full w-full bg-background relative">
      {/* Context Sidebar */}
      <ContextSidebar
        contexts={contexts}
        selectedContext={selectedContext}
        onContextSelect={setSelectedContext}
      />

      <div style={{ width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.1}
          maxZoom={4}
          edgesUpdatable={false}
          edgesFocusable={false}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          proOptions={{ hideAttribution: true }}
        >
          <Controls position="top-right" />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-card border border-border rounded-lg p-4 text-sm">
        <div className="font-semibold mb-2">Relationships</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-emerald-500"></div>
            <span className="text-xs">Composition</span>
            <Tooltip content="A strong ownership relationship where the child entity is part of the parent. If the parent is deleted, the child is also deleted. Example: Order has OrderItems.">
              <Info className="size-3 text-muted-foreground ml-1" />
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-blue-500"
              style={{ strokeDasharray: "5,5" }}
            ></div>
            <span className="text-xs">Reference (ID)</span>
            <Tooltip content="A weak relationship where an entity references another by ID only. The referenced entity has an independent lifecycle. Example: Order references Customer by customerId.">
              <Info className="size-3 text-muted-foreground ml-1" />
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-purple-500"
              style={{ strokeDasharray: "2,2" }}
            ></div>
            <span className="text-xs">Aggregation</span>
            <Tooltip content="An entity has another entity, but with independent lifecycle. Stronger than reference, weaker than composition. Example: Customer has Addresses.">
              <Info className="size-3 text-muted-foreground ml-1" />
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-red-500"></div>
            <span className="text-xs font-semibold">Cross-Context</span>
            <Tooltip content="A relationship between entities from different bounded contexts. This indicates coupling between contexts and should be carefully considered. Example: Order (Sales) references Product (Catalog).">
              <Info className="size-3 text-muted-foreground ml-1" />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Entity Detail Drawer */}
      <EntityDetailDrawer
        entity={selectedEntity}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export default function EntityDiagram(props: EntityDiagramProps) {
  return (
    <ReactFlowProvider>
      <EntityDiagramFlow {...props} />
    </ReactFlowProvider>
  );
}
