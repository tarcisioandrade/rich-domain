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
 * Detect cycles in the dependency graph using DFS
 */
function detectCycles(nodes: Map<string, DependencyNode>): {
  hasCycles: boolean;
  cycles: string[][];
} {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(nodeName: string, path: string[]): boolean {
    visited.add(nodeName);
    recursionStack.add(nodeName);
    path.push(nodeName);

    const node = nodes.get(nodeName);
    if (!node) return false;

    for (const dep of node.dependencies) {
      if (!visited.has(dep)) {
        if (dfs(dep, path)) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart);
        cycle.push(dep); // Complete the cycle
        cycles.push(cycle);
        return true;
      }
    }

    recursionStack.delete(nodeName);
    path.pop();
    return false;
  }

  for (const nodeName of nodes.keys()) {
    if (!visited.has(nodeName)) {
      dfs(nodeName, []);
    }
  }

  return {
    hasCycles: cycles.length > 0,
    cycles,
  };
}

/**
 * Analyze models to determine their dependencies and classify as Aggregate or Entity
 *
 * Note: Bidirectional relations (User has Post[], Post has author: User) are NORMAL
 * in Prisma and not problematic cycles. We only care about generation order.
 */
export function analyzeDependencies(models: PrismaModel[]): DependencyAnalysis {
  const nodes = new Map<string, DependencyNode>();
  const modelNames = new Set(models.map((m) => m.name));

  // First pass: create nodes
  // Dependencies here mean "models this model references" for import purposes
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
      dependencies: [...new Set(dependencies)],
      isAggregate: false,
    });
  }

  // Classify aggregates vs entities (this is what really matters)
  classifyModels(nodes, models);

  // Determine generation order based on "ownership" not just any relation
  // Entities (owned) should be generated before Aggregates (owners)
  const sortedNames = determineGenerationOrder(nodes);

  const aggregates = Array.from(nodes.values())
    .filter((n) => n.isAggregate)
    .map((n) => n.model.name);

  const entities = Array.from(nodes.values())
    .filter((n) => !n.isAggregate)
    .map((n) => n.model.name);

  // Detect cycles in the dependency graph
  const cycleDetection = detectCycles(nodes);

  return {
    nodes,
    sortedNames,
    aggregates,
    entities,
    hasCycles: cycleDetection.hasCycles,
    cycles: cycleDetection.cycles,
  };
}

/**
 * Determine generation order
 *
 * Strategy: Generate entities (children) before aggregates (parents)
 * This ensures that when we use z.instanceof(Entity), the class exists
 */
function determineGenerationOrder(
  nodes: Map<string, DependencyNode>
): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();

  // First: models with no relations (standalone)
  for (const [name, node] of nodes) {
    if (node.dependencies.length === 0) {
      sorted.push(name);
      visited.add(name);
    }
  }

  // Second: entities (they are "owned" by aggregates)
  for (const [name, node] of nodes) {
    if (!visited.has(name) && !node.isAggregate) {
      sorted.push(name);
      visited.add(name);
    }
  }

  // Third: aggregates
  for (const [name, node] of nodes) {
    if (!visited.has(name) && node.isAggregate) {
      sorted.push(name);
      visited.add(name);
    }
  }

  // Safety: add any remaining
  for (const name of nodes.keys()) {
    if (!visited.has(name)) {
      sorted.push(name);
    }
  }

  return sorted;
}

/**
 * Classify models as Aggregates or Entities based on their relationships
 *
 * Rules:
 * - Model that is referenced via FK by others = Aggregate (it's a "parent")
 * - Model with list relations (one-to-many) = Aggregate
 * - Model that has FK to others but isn't referenced = Entity (it's a "child")
 * - Model with no relations = Aggregate (standalone, can be a root)
 * - N:N relations: both sides are typically Aggregates
 */
function classifyModels(
  nodes: Map<string, DependencyNode>,
  models: PrismaModel[]
): void {
  // Find which models are referenced by others via FK
  const referencedBy = new Map<string, string[]>();

  for (const model of models) {
    for (const field of model.fields) {
      // This field has FK (relationFromFields) = this model "belongs to" the other
      if (field.kind === "object" && field.relationFromFields?.length) {
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

    // Is this model referenced by others via FK?
    const isReferencedByOthers = (referencedBy.get(name) ?? []).length > 0;

    // Does this model have FK fields pointing to others?
    const hasForeignKeys = model.fields.some(
      (f) => f.kind === "object" && f.relationFromFields?.length
    );

    // Does this model have list relations (one-to-many)?
    const hasListRelations = model.fields.some(
      (f) => f.kind === "object" && f.isList
    );

    // N:N detection: list relation WITHOUT FK on this side
    const hasManyToMany = model.fields.some(
      (f) => f.kind === "object" && f.isList && !f.relationFromFields?.length
    );

    // Classification:
    if (isReferencedByOthers || hasListRelations || hasManyToMany) {
      // Referenced by others OR has children = Aggregate
      node.isAggregate = true;
    } else if (hasForeignKeys && !isReferencedByOthers) {
      // Only has FKs, not referenced = Entity (child/owned)
      node.isAggregate = false;
    } else {
      // No relations or unclear = Aggregate (safe default)
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
