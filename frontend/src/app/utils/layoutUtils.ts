import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

// Match the exact rendered dimensions of PersonNode component
const NODE_WIDTH = 220;
const NODE_HEIGHT = 120; // includes bio, custom fields, action buttons

/**
 * Computes an automatic top-to-bottom generational layout for all family nodes
 * using the Dagre graph layout engine.
 *
 * Spouse edges are excluded from Dagre's DAG calculation (they create cycles)
 * and are instead post-processed to snap spouse pairs side-by-side horizontally.
 *
 * @param nodes  - Current React Flow node array
 * @param edges  - Current React Flow edge array
 * @param direction - Dagre rankdir, defaults to 'TB' (top-to-bottom)
 * @returns Flat position array ready for API bulk update and Zustand patch
 */
export const getAutoLayoutedNodes = (
  nodes: Node[],
  edges: Edge[],
  direction = 'TB'
): { id: string; x: number; y: number }[] => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure Dagre spacing — generous gaps for readability on large trees
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80,   // Horizontal gap between sibling nodes on same generation level
    ranksep: 130,  // Vertical gap between parent/child generations
  });

  // Register all nodes with their physical dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Register hierarchical parent-child edges only.
  // We MUST exclude 'spouse' and 'sibling' relationship types. Including them
  // as directed edges would force partners or siblings onto different vertical
  // layers, distorting the tree layout and causing them to stack vertically!
  edges.forEach((edge) => {
    const relationType = edge.data?.relationType;
    const isSpouseEdge =
      relationType === 'spouse' ||
      edge.sourceHandle?.includes('partner') ||
      edge.targetHandle?.includes('partner');
    const isSiblingEdge = relationType === 'sibling';

    if (!isSpouseEdge && !isSiblingEdge) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  // Run the Dagre layout algorithm
  dagre.layout(dagreGraph);

  // Extract computed positions — Dagre uses center-origin; React Flow uses top-left origin
  const calculatedPositions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    const dagreNode = dagreGraph.node(node.id);
    calculatedPositions.set(node.id, {
      x: dagreNode.x - NODE_WIDTH / 2,
      y: dagreNode.y - NODE_HEIGHT / 2,
    });
  });

  // Post-processing: snap spouse pairs to the same Y-plane, side-by-side
  edges.forEach((edge) => {
    const relationType = edge.data?.relationType;
    const isSpouseEdge =
      relationType === 'spouse' ||
      edge.sourceHandle?.includes('partner') ||
      edge.targetHandle?.includes('partner');

    if (isSpouseEdge) {
      const sourcePos = calculatedPositions.get(edge.source);
      if (sourcePos) {
        // Place spouse (target) immediately to the right of their partner
        calculatedPositions.set(edge.target, {
          x: sourcePos.x + NODE_WIDTH + 100,
          y: sourcePos.y,
        });
      }
    }
  });

  // Return as flat array with integer coordinates for the API and Zustand store
  return Array.from(calculatedPositions.entries()).map(([id, pos]) => ({
    id,
    x: Math.round(pos.x),
    y: Math.round(pos.y),
  }));
};
