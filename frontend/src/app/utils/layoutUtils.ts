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

  // Filter edges to only those connecting valid registered nodes in the graph
  const validEdges = edges.filter(
    (e) => dagreGraph.hasNode(e.source) && dagreGraph.hasNode(e.target)
  );

  // Normalize parent-child and adopted edges so that the parent is always the source and the child is the target
  // based on edge handle identifiers (e.g. child-out is on the parent, parent-in is on the child).
  // This guarantees that parents are always placed above children regardless of how the line was drawn.
  const normalizedEdges = validEdges.map((e) => {
    if (e.data?.relationType === 'parent' || e.data?.relationType === 'adopted') {
      const isReversed = e.sourceHandle?.includes('parent-in') || e.targetHandle?.includes('child-out');
      if (isReversed) {
        return {
          ...e,
          source: e.target,
          target: e.source,
          sourceHandle: e.targetHandle,
          targetHandle: e.sourceHandle,
        };
      }
    }
    return e;
  });

  // Separate spouse, sibling, and regular parent-child lines
  const spouseEdges = normalizedEdges.filter(
    (e) => e.data?.relationType === 'spouse' || e.sourceHandle?.includes('partner')
  );
  const siblingEdges = normalizedEdges.filter(
    (e) => e.data?.relationType === 'sibling'
  );
  const regularEdges = normalizedEdges.filter(
    (e) => e.data?.relationType !== 'spouse' && e.data?.relationType !== 'sibling' && !e.sourceHandle?.includes('partner')
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

    // Route children so they stem out of the virtual union node (works for both biological parent and adopted relationships!)
    // Sort siblings horizontally based on user connection direction (source sibling connects left -> target sibling connects right)
    const unionChildren = regularEdges
      .filter((regEdge) => regEdge.source === edge.source || regEdge.source === edge.target)
      .map((regEdge) => regEdge.target);

    unionChildren.sort((childA, childB) => {
      if (siblingEdges.some((se) => se.source === childA && se.target === childB)) return -1;
      if (siblingEdges.some((se) => se.source === childB && se.target === childA)) return 1;
      return 0;
    });

    unionChildren.forEach((childId) => {
      dagreGraph.setEdge(virtualUnionId, childId);
    });
  });

  // Add the remaining parent-child/adopted relations not connected directly to unions
  regularEdges.forEach((edge) => {
    if (!dagreGraph.hasEdge(edge.source, edge.target)) {
      const parentIsSpouse = spouseEdges.some(se => se.source === edge.source || se.target === edge.source);
      if (!parentIsSpouse) {
        dagreGraph.setEdge(edge.source, edge.target);
      }
    }
  });

  // Sibling connections are omitted from the Dagre graph to prevent cyclical constraints or ranking conflicts (Dagre naturally aligns them on the same rank because they share the same parent virtual union node). React Flow will draw the visual sibling lines cleanly between them.

  // Calculate coordinates using Dagre
  dagre.layout(dagreGraph);

  // Extract center coordinates, adjusting to top-left origin for React Flow using node dimensions
  // 1. Group nodes by their Dagre rank index (guarantees perfect generation grouping)
  const nodesByRank = new Map<number, typeof nodes>();
  nodes.forEach((node) => {
    const dagreNode = dagreGraph.node(node.id);
    if (!dagreNode) return;
    
    // Group by rank index, falling back to rounded bucket coordinates if rank index is not defined
    const rankValue = (dagreNode as any).rank !== undefined 
      ? (dagreNode as any).rank 
      : (rankdir === 'TB' ? Math.round(dagreNode.y / 60) * 60 : Math.round(dagreNode.x / 60) * 60);
      
    if (!nodesByRank.has(rankValue)) {
      nodesByRank.set(rankValue, []);
    }
    nodesByRank.get(rankValue)!.push(node);
  });

  const finalPositions = new Map<string, { x: number; y: number }>();

  // 2. Process each rank group
  nodesByRank.forEach((rankNodes, _rankKey) => {
    if (rankNodes.length === 0) return;

    if (rankdir === 'TB') {
      // Find the minimum top Y among all nodes in this rank to perfectly top-align all cards in this generation row
      let minTopY = Infinity;
      rankNodes.forEach((node) => {
        const dagreNode = dagreGraph.node(node.id);
        const height = node.measured?.height || NODE_HEIGHT;
        const topY = dagreNode.y - height / 2;
        if (topY < minTopY) {
          minTopY = topY;
        }
      });

      // Get sorted X coordinates of Dagre node centers in this rank
      const sortedXCoords = rankNodes
        .map((node) => Math.round(dagreGraph.node(node.id).x))
        .sort((a, b) => a - b);

      // Sort nodes horizontally based on relationship handle directions
      const sortedNodes = [...rankNodes];
      sortedNodes.sort((nodeA, nodeB) => {
        const edge = validEdges.find(
          (e) => (e.source === nodeA.id && e.target === nodeB.id) || (e.source === nodeB.id && e.target === nodeA.id)
        );
        if (!edge) return 0;

        const isSrcA = edge.source === nodeA.id;
        const srcHandle = edge.sourceHandle || '';
        const tgtHandle = edge.targetHandle || '';

        if (isSrcA) {
          if (srcHandle.includes('right') || tgtHandle.includes('left')) return -1;
          if (srcHandle.includes('left') || tgtHandle.includes('right')) return 1;
        } else {
          if (srcHandle.includes('right') || tgtHandle.includes('left')) return 1;
          if (srcHandle.includes('left') || tgtHandle.includes('right')) return -1;
        }
        return 0;
      });

      // Assign perfect horizontal positions and a unified top-aligned Y coordinate
      sortedNodes.forEach((node, idx) => {
        const width = node.measured?.width || NODE_WIDTH;
        finalPositions.set(node.id, {
          x: sortedXCoords[idx] - Math.round(width / 2),
          y: Math.round(minTopY),
        });
      });
    } else {
      // rankdir === 'LR': Align vertically into columns (left-aligned)
      let minLeftX = Infinity;
      rankNodes.forEach((node) => {
        const dagreNode = dagreGraph.node(node.id);
        const width = node.measured?.width || NODE_WIDTH;
        const leftX = dagreNode.x - width / 2;
        if (leftX < minLeftX) {
          minLeftX = leftX;
        }
      });

      // Get sorted Y coordinates of Dagre node centers in this rank
      const sortedYCoords = rankNodes
        .map((node) => Math.round(dagreGraph.node(node.id).y))
        .sort((a, b) => a - b);

      // Sort nodes vertically (same logic as horizontal but mapping to y-axis)
      const sortedNodes = [...rankNodes];
      sortedNodes.sort((nodeA, nodeB) => {
        const edge = validEdges.find(
          (e) => (e.source === nodeA.id && e.target === nodeB.id) || (e.source === nodeB.id && e.target === nodeA.id)
        );
        if (!edge) return 0;

        const isSrcA = edge.source === nodeA.id;
        const srcHandle = edge.sourceHandle || '';
        const tgtHandle = edge.targetHandle || '';

        if (isSrcA) {
          if (srcHandle.includes('bottom') || tgtHandle.includes('top')) return -1;
          if (srcHandle.includes('top') || tgtHandle.includes('bottom')) return 1;
        } else {
          if (srcHandle.includes('bottom') || tgtHandle.includes('top')) return 1;
          if (srcHandle.includes('top') || tgtHandle.includes('bottom')) return -1;
        }
        return 0;
      });

      // Assign perfect vertical positions and a unified left-aligned X coordinate
      sortedNodes.forEach((node, idx) => {
        const height = node.measured?.height || NODE_HEIGHT;
        finalPositions.set(node.id, {
          x: Math.round(minLeftX),
          y: sortedYCoords[idx] - Math.round(height / 2),
        });
      });
    }
  });

  return nodes.map((node) => {
    const pos = finalPositions.get(node.id) || { x: node.position.x, y: node.position.y };
    return {
      id: node.id,
      x: pos.x,
      y: pos.y,
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
