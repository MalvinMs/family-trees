import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 260;
const NODE_HEIGHT = 220; // Default fallback dimensions if not yet measured by the DOM

// Supported Auto-Arrange Layout Algorithms
export type LayoutAlgorithmType = 'HIERARCHICAL_TB' | 'HIERARCHICAL_LR' | 'ORGANIC';

/**
 * Main Auto-Arrange Layout Router (dbdiagram.io style)
 */
export const getAutoLayoutedNodes = (
  nodes: Node[],
  edges: Edge[],
  algorithm: LayoutAlgorithmType = 'HIERARCHICAL_TB'
 ): { id: string; x: number; y: number }[] => {
  if (algorithm === 'ORGANIC') {
    return runOrganicLayout(nodes, edges);
  }
  return runHierarchicalLayout(nodes, edges, algorithm === 'HIERARCHICAL_LR' ? 'LR' : 'TB');
};

/**
 * 1 & 2. Hierarchical Layout Engine (Fixes Spouse Overlap Bug via Virtual Unions)
 */
const runHierarchicalLayout = (
  nodes: Node[],
  edges: Edge[],
  rankdir: 'TB' | 'LR'
): { id: string; x: number; y: number }[] => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: rankdir,
    nodesep: rankdir === 'TB' ? 180 : 140, // Increased sibling/rank spacing for vertical/horizontal to prevent overlaps
    ranksep: rankdir === 'TB' ? 220 : 280,
  });

  // Register all real nodes using measured dimensions if available, falling back to safe margins
  nodes.forEach((node) => {
    const width = node.measured?.width || NODE_WIDTH;
    const height = node.measured?.height || NODE_HEIGHT;
    dagreGraph.setNode(node.id, { width, height });
  });

  // Separate spouse relations and regular parent-child lines
  const spouseEdges = edges.filter(
    (e) => e.data?.relationType === 'spouse' || e.sourceHandle?.includes('partner')
  );
  const regularEdges = edges.filter(
    (e) => e.data?.relationType !== 'spouse' && !e.sourceHandle?.includes('partner')
  );

  const processedSpouses = new Set<string>();

  spouseEdges.forEach((edge) => {
    const spouseKey = [edge.source, edge.target].sort().join('-');
    if (processedSpouses.has(spouseKey)) return;
    processedSpouses.add(spouseKey);

    const virtualUnionId = `union-${spouseKey}`;

    // Register a 10x10 virtual connector node inside Dagre
    dagreGraph.setNode(virtualUnionId, { width: 10, height: 10 });

    // Link spouse nodes into the virtual midpoint node
    dagreGraph.setEdge(edge.source, virtualUnionId);
    dagreGraph.setEdge(edge.target, virtualUnionId);

    // Route children so they stem out of the virtual union node
    regularEdges.forEach((regEdge) => {
      if (regEdge.source === edge.source || regEdge.source === edge.target) {
        dagreGraph.setEdge(virtualUnionId, regEdge.target);
      }
    });
  });

  // Add the remaining parent-child/sibling relations not connected directly to unions
  regularEdges.forEach((edge) => {
    if (!dagreGraph.hasEdge(edge.source, edge.target)) {
      const parentIsSpouse = spouseEdges.some(se => se.source === edge.source || se.target === edge.source);
      if (!parentIsSpouse) {
        dagreGraph.setEdge(edge.source, edge.target);
      }
    }
  });

  // Calculate coordinates using Dagre
  dagre.layout(dagreGraph);

  // Extract center coordinates, adjusting to top-left origin for React Flow using node dimensions
  return nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    const width = node.measured?.width || NODE_WIDTH;
    const height = node.measured?.height || NODE_HEIGHT;
    return {
      id: node.id,
      x: Math.round(dagreNode.x - width / 2),
      y: Math.round(dagreNode.y - height / 2),
    };
  });
};

/**
 * 3. Organic Layout Engine (Force-Directed Physics simulation)
 */
const runOrganicLayout = (nodes: Node[], edges: Edge[]): { id: string; x: number; y: number }[] => {
  const positions = new Map<string, { x: number; y: number }>();
  
  // Set initial coordinates or spread nodes out randomly if zero
  nodes.forEach((node, index) => {
    positions.set(node.id, {
      x: node.position.x || (index % 5) * 300,
      y: node.position.y || Math.floor(index / 5) * 300,
    });
  });

  const iterations = 80; // Expanded physics simulation loops for better settling
  const k = 380; // Ideal distance constant increased for generous breathing room
  const repulsionRadius = 600; // Increased to repel overlapping cards aggressively

  for (let iter = 0; iter < iterations; iter++) {
    // A. Force Repulsion: nodes push each other away to prevent overlaps
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const posA = positions.get(nodeA.id)!;
        const posB = positions.get(nodeB.id)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        if (distance < repulsionRadius) {
          const force = (k * k) / distance;
          const fx = (dx / distance) * force * 0.4;
          const fy = (dy / distance) * force * 0.4;

          posA.x -= fx;
          posA.y -= fy;
          posB.x += fx;
          posB.y += fy;
        }
      }
    }

    // B. Force Attraction: connection edges draw related nodes closer
    edges.forEach((edge) => {
      const posSource = positions.get(edge.source);
      const posTarget = positions.get(edge.target);
      if (!posSource || !posTarget) return;

      const dx = posTarget.x - posSource.x;
      const dy = posTarget.y - posSource.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = (distance * distance) / k;
      const fx = (dx / distance) * force * 0.15;
      const fy = (dy / distance) * force * 0.15;

      posSource.x += fx;
      posSource.y += fy;
      posTarget.x -= fx;
      posTarget.y -= fy;
    });
  }

  return Array.from(positions.entries()).map(([id, pos]) => ({
    id,
    x: Math.round(pos.x),
    y: Math.round(pos.y),
  }));
};
