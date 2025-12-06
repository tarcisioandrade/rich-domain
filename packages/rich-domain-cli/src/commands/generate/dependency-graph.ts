import type { PrismaModel } from "./prisma-parser.js";

/**
 * Represents a node in the dependency graph
 */
export interface DependencyNode {
  model: PrismaModel;
  dependencies: string[];
  isAggregate: boolean;
}

/**
 * Result of dependency analysis
 */
export interface DependencyAnalysis {
  nodes: Map<string, DependencyNode>;
  sortedNames: string[];
  aggregates: string[];
  entities: string[];
  hasCycles: boolean;
  cycles: string[][];
}

/**
 * Analyze models to determine their dependencies and classify as Aggregate or Entity
 */
export function analyzeDependencies(models: PrismaModel[]): DependencyAnalysis {
  const nodes = new Map<string, DependencyNode>();
  const modelNames = new Set(models.map((m) => m.name));

  // First pass: create nodes with dependencies
  for (const model of models) {
    const dependencies: string[] = [];

    for (const field of model.fields) {
      // Only consider relations to other models in our schema
      if (field.kind === "object" && modelNames.has(field.type)) {
        dependencies.push(field.type);
      }
    }

    nodes.set(model.name, {
      model,
      dependencies: [...new Set(dependencies)], // Remove duplicates
      isAggregate: false, // Will be determined later
    });
  }

  // Detect cycles
  const { hasCycles, cycles } = detectCycles(nodes);

  // Topological sort
  const sortedNames = topologicalSort(nodes);

  // Classify aggregates vs entities
  classifyModels(nodes, models);

  const aggregates = Array.from(nodes.values())
    .filter((n) => n.isAggregate)
    .map((n) => n.model.name);

  const entities = Array.from(nodes.values())
    .filter((n) => !n.isAggregate)
    .map((n) => n.model.name);

  return {
    nodes,
    sortedNames,
    aggregates,
    entities,
    hasCycles,
    cycles,
  };
}

/**
 * Detect cycles in the dependency graph using DFS
 */
function detectCycles(nodes: Map<string, DependencyNode>): {
  hasCycles: boolean;
  cycles: string[][];
} {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(name: string, path: string[]): boolean {
    visited.add(name);
    recursionStack.add(name);

    const node = nodes.get(name);
    if (!node) return false;

    for (const dep of node.dependencies) {
      if (!visited.has(dep)) {
        if (dfs(dep, [...path, dep])) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        } else {
          cycles.push([...path, dep]);
        }
      }
    }

    recursionStack.delete(name);
    return false;
  }

  for (const name of nodes.keys()) {
    if (!visited.has(name)) {
      dfs(name, [name]);
    }
  }

  return { hasCycles: cycles.length > 0, cycles };
}

/**
 * Topological sort using Kahn's algorithm
 */
function topologicalSort(nodes: Map<string, DependencyNode>): string[] {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // Initialize
  for (const name of nodes.keys()) {
    inDegree.set(name, 0);
    adjList.set(name, []);
  }

  // Build adjacency list and calculate in-degrees
  for (const [name, node] of nodes) {
    for (const dep of node.dependencies) {
      if (nodes.has(dep)) {
        adjList.get(dep)!.push(name);
        inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
      }
    }
  }

  // Find all nodes with no incoming edges
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const name = queue.shift()!;
    sorted.push(name);

    for (const dependent of adjList.get(name) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDegree);

      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // If we couldn't sort all nodes, there's a cycle
  // Return what we have, the remaining will be added at the end
  if (sorted.length < nodes.size) {
    for (const name of nodes.keys()) {
      if (!sorted.includes(name)) {
        sorted.push(name);
      }
    }
  }

  return sorted;
}

/**
 * Classify models as Aggregates or Entities based on their relationships
 *
 * Rules:
 * - Model with "child" relations (other models reference it) = Aggregate
 * - Model that only references others = Entity
 * - Model with no relations = Entity (standalone, simple case)
 * - Model with bidirectional relations where it's the "owner" = Aggregate
 */
function classifyModels(
  nodes: Map<string, DependencyNode>,
  models: PrismaModel[]
): void {
  // Find which models are referenced by others (potential aggregate roots)
  const referencedBy = new Map<string, string[]>();

  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind === "object" && field.relationFromFields?.length) {
        // This model references another - the other is potentially an aggregate
        const referenced = field.type;
        if (!referencedBy.has(referenced)) {
          referencedBy.set(referenced, []);
        }
        referencedBy.get(referenced)!.push(model.name);
      }
    }
  }

  for (const [name, node] of nodes) {
    const model = node.model;

    // Check if this model is referenced by others
    const refs = referencedBy.get(name) ?? [];

    // Check if this model has "owning" relations (has FK fields)
    const hasOwnedRelations = model.fields.some(
      (f) => f.kind === "object" && f.relationFromFields?.length
    );

    // Check if this model has "parent" relations (others have FK to it)
    const hasChildRelations = refs.length > 0;

    // Check for list relations (one-to-many)
    const hasListRelations = model.fields.some(
      (f) => f.kind === "object" && f.isList
    );

    // Classification logic:
    // 1. If it has children (other models reference it) = Aggregate
    // 2. If it has list relations (one-to-many as parent) = Aggregate
    // 3. If it only has FK relations to others = Entity
    // 4. Default: Aggregate (conservative approach)

    if (hasChildRelations || hasListRelations) {
      node.isAggregate = true;
    } else if (hasOwnedRelations && !hasChildRelations) {
      node.isAggregate = false;
    } else {
      // No clear indication - default to Aggregate for flexibility
      node.isAggregate = true;
    }
  }
}

/**
 * Get the generation order for models (dependencies first)
 */
export function getGenerationOrder(
  analysis: DependencyAnalysis
): PrismaModel[] {
  return analysis.sortedNames
    .map((name) => analysis.nodes.get(name)?.model)
    .filter((m): m is PrismaModel => m !== undefined);
}
