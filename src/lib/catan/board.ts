import {
  GameBoard,
  Hex,
  Vertex,
  Edge,
  Port,
  HexTerrain,
  Resource,
  PortType,
  CubeCoord,
} from './types';

export const HEX_RADIUS = 60; // Size in SVG pixels
const SQRT3 = Math.sqrt(3);

// Pip counts for each dice roll value
export const NUMBER_PIPS: Record<number, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};

export const TERRAIN_RESOURCES: Record<HexTerrain, Resource | null> = {
  forest: 'wood',
  pasture: 'sheep',
  fields: 'wheat',
  hills: 'brick',
  mountains: 'ore',
  desert: null,
};

export const TERRAIN_COLORS: Record<HexTerrain, { bg: string; stroke: string; label: string }> = {
  forest: { bg: '#2d6a4f', stroke: '#1b4332', label: 'Forest (Lumber)' },
  pasture: { bg: '#95d5b2', stroke: '#52b788', label: 'Pasture (Wool)' },
  fields: { bg: '#ffb703', stroke: '#fb8500', label: 'Fields (Grain)' },
  hills: { bg: '#bc4749', stroke: '#6a040f', label: 'Hills (Brick)' },
  mountains: { bg: '#6c757d', stroke: '#495057', label: 'Mountains (Ore)' },
  desert: { bg: '#e9d8a6', stroke: '#d4a373', label: 'Desert' },
};

export const RESOURCE_COLORS: Record<Resource, string> = {
  wood: '#2d6a4f',
  sheep: '#74c69d',
  wheat: '#ffb703',
  brick: '#bc4749',
  ore: '#6c757d',
};

// 19 Hex layout definition: row-by-row (3, 4, 5, 4, 3)
// Pointy-topped coordinates in axial (q, r)
const HEX_GRID_DEFINITIONS: { q: number; r: number }[] = [
  // Row 0: 3 hexes (r = -2)
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  // Row 1: 4 hexes (r = -1)
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  // Row 2: 5 hexes (r = 0)
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  // Row 3: 4 hexes (r = 1)
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  // Row 4: 3 hexes (r = 2)
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
];

// Standard balanced resource distribution
const STANDARD_TERRAINS: HexTerrain[] = [
  'forest', 'pasture', 'fields',
  'hills', 'mountains', 'forest', 'pasture',
  'desert', 'fields', 'hills', 'pasture', 'fields',
  'forest', 'mountains', 'fields', 'pasture',
  'hills', 'mountains', 'forest'
];

// Standard spiral number token layout
const STANDARD_NUMBERS = [
  5, 2, 6,
  3, 8, 10, 9,
  12, 11, 4, 8, 10,
  9, 4, 5, 6,
  3, 11
];

// Convert axial (q, r) to pixel (x, y) for pointy-top hexes
export function hexToPixel(q: number, r: number, radius: number = HEX_RADIUS, centerOffsetX = 450, centerOffsetY = 400) {
  const x = radius * (SQRT3 * q + (SQRT3 / 2) * r) + centerOffsetX;
  const y = radius * ((3 / 2) * r) + centerOffsetY;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

// Calculate the 6 corner vertices of a pointy-top hex
export function getHexCornerPoints(cx: number, cy: number, radius: number = HEX_RADIUS) {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i + 30);
    const x = cx + radius * Math.cos(angleRad);
    const y = cy + radius * Math.sin(angleRad);
    corners.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    });
  }
  return corners;
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateCatanBoard(randomize = false): GameBoard {
  const hexes: Hex[] = [];
  const vertices: Vertex[] = [];
  const edges: Edge[] = [];
  const ports: Port[] = [];

  let terrains = [...STANDARD_TERRAINS];
  if (randomize) {
    terrains = shuffleArray(terrains);
  }

  // Assign numbers to non-desert hexes
  let numberIndex = 0;
  const numberTokens = randomize ? shuffleArray([...STANDARD_NUMBERS]) : [...STANDARD_NUMBERS];

  // Map to deduplicate vertices and edges by rounded coordinates
  const vertexCoordMap = new Map<string, number>();
  const edgeCoordMap = new Map<string, number>();

  const getVertexKey = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;
  const getEdgeKey = (v1: number, v2: number) => {
    const [min, max] = v1 < v2 ? [v1, v2] : [v2, v1];
    return `${min}-${max}`;
  };

  let desertHexId = 0;

  // 1. Generate Hexes and register vertices/edges
  HEX_GRID_DEFINITIONS.forEach((def, hexId) => {
    const terrain = terrains[hexId];
    const isDesert = terrain === 'desert';
    const num = isDesert ? null : numberTokens[numberIndex++];
    const pips = num ? NUMBER_PIPS[num] || 0 : 0;
    const { x: pixelX, y: pixelY } = hexToPixel(def.q, def.r);

    if (isDesert) {
      desertHexId = hexId;
    }

    const corners = getHexCornerPoints(pixelX, pixelY);
    const hexVertexIds: number[] = [];
    const hexEdgeIds: number[] = [];

    // Register or retrieve each corner vertex
    corners.forEach((pt) => {
      const key = getVertexKey(pt.x, pt.y);
      let vId = vertexCoordMap.get(key);
      if (vId === undefined) {
        vId = vertices.length;
        vertexCoordMap.set(key, vId);
        vertices.push({
          id: vId,
          pixelX: pt.x,
          pixelY: pt.y,
          adjacentVertexIds: [],
          adjacentEdgeIds: [],
          adjacentHexIds: [],
          building: null,
          port: null,
        });
      }
      hexVertexIds.push(vId);
      if (!vertices[vId].adjacentHexIds.includes(hexId)) {
        vertices[vId].adjacentHexIds.push(hexId);
      }
    });

    // Register or retrieve each border edge
    for (let i = 0; i < 6; i++) {
      const v1 = hexVertexIds[i];
      const v2 = hexVertexIds[(i + 1) % 6];
      const edgeKey = getEdgeKey(v1, v2);

      let eId = edgeCoordMap.get(edgeKey);
      if (eId === undefined) {
        eId = edges.length;
        edgeCoordMap.set(edgeKey, eId);
        const vert1 = vertices[v1];
        const vert2 = vertices[v2];
        edges.push({
          id: eId,
          v1,
          v2,
          pixelX1: vert1.pixelX,
          pixelY1: vert1.pixelY,
          pixelX2: vert2.pixelX,
          pixelY2: vert2.pixelY,
          adjacentEdgeIds: [],
          adjacentHexIds: [],
          road: null,
        });
      }
      hexEdgeIds.push(eId);

      if (!edges[eId].adjacentHexIds.includes(hexId)) {
        edges[eId].adjacentHexIds.push(hexId);
      }

      // Hook up vertex-edge adjacency
      if (!vertices[v1].adjacentEdgeIds.includes(eId)) {
        vertices[v1].adjacentEdgeIds.push(eId);
      }
      if (!vertices[v2].adjacentEdgeIds.includes(eId)) {
        vertices[v2].adjacentEdgeIds.push(eId);
      }
      if (!vertices[v1].adjacentVertexIds.includes(v2)) {
        vertices[v1].adjacentVertexIds.push(v2);
      }
      if (!vertices[v2].adjacentVertexIds.includes(v1)) {
        vertices[v2].adjacentVertexIds.push(v1);
      }
    }

    hexes.push({
      id: hexId,
      coord: { q: def.q, r: def.r, s: -def.q - def.r },
      terrain,
      resource: TERRAIN_RESOURCES[terrain],
      numberToken: num,
      pips,
      hasRobber: isDesert,
      vertexIds: hexVertexIds,
      edgeIds: hexEdgeIds,
      pixelX,
      pixelY,
    });
  });

  // 2. Hook up edge-to-edge adjacency
  edges.forEach((edge) => {
    const v1Edges = vertices[edge.v1].adjacentEdgeIds.filter((id) => id !== edge.id);
    const v2Edges = vertices[edge.v2].adjacentEdgeIds.filter((id) => id !== edge.id);
    edge.adjacentEdgeIds = Array.from(new Set([...v1Edges, ...v2Edges]));
  });

  // 3. Define the 9 standard coastal ports
  // Find boundary edges (edges touching only 1 hex)
  const coastalEdges = edges.filter((e) => e.adjacentHexIds.length === 1);

  // Standard port templates: 4 generic 3:1, and 5 2:1 resource ports
  const portTemplates: { type: PortType; ratio: number; resource: Resource | null; label: string }[] = [
    { type: 'generic_3_1', ratio: 3, resource: null, label: '3:1' },
    { type: 'wood_2_1', ratio: 2, resource: 'wood', label: '2:1 Wood' },
    { type: 'sheep_2_1', ratio: 2, resource: 'sheep', label: '2:1 Sheep' },
    { type: 'wheat_2_1', ratio: 2, resource: 'wheat', label: '2:1 Wheat' },
    { type: 'generic_3_1', ratio: 3, resource: null, label: '3:1' },
    { type: 'brick_2_1', ratio: 2, resource: 'brick', label: '2:1 Brick' },
    { type: 'generic_3_1', ratio: 3, resource: null, label: '3:1' },
    { type: 'ore_2_1', ratio: 2, resource: 'ore', label: '2:1 Ore' },
    { type: 'generic_3_1', ratio: 3, resource: null, label: '3:1' },
  ];

  // Distribute ports around outer perimeter sorted by polar angle from center
  const centerX = 450;
  const centerY = 400;

  const sortedCoastalEdges = [...coastalEdges].sort((a, b) => {
    const midXa = (a.pixelX1 + a.pixelX2) / 2;
    const midYa = (a.pixelY1 + a.pixelY2) / 2;
    const angleA = Math.atan2(midYa - centerY, midXa - centerX);

    const midXb = (b.pixelX1 + b.pixelX2) / 2;
    const midYb = (b.pixelY1 + b.pixelY2) / 2;
    const angleB = Math.atan2(midYb - centerY, midXb - centerX);

    return angleA - angleB;
  });

  // Pick 9 well-spaced coastal edges for the ports
  const step = Math.floor(sortedCoastalEdges.length / 9);
  portTemplates.forEach((template, index) => {
    const edgeIndex = (index * step) % sortedCoastalEdges.length;
    const edge = sortedCoastalEdges[edgeIndex];
    const midX = (edge.pixelX1 + edge.pixelX2) / 2;
    const midY = (edge.pixelY1 + edge.pixelY2) / 2;

    // Push slightly outward for port label
    const angle = Math.atan2(midY - centerY, midX - centerX);
    const portPixelX = midX + Math.cos(angle) * 32;
    const portPixelY = midY + Math.sin(angle) * 32;

    const port: Port = {
      id: index,
      type: template.type,
      vertexIds: [edge.v1, edge.v2],
      edgeId: edge.id,
      ratio: template.ratio,
      resource: template.resource,
      label: template.label,
      pixelX: Math.round(portPixelX),
      pixelY: Math.round(portPixelY),
    };

    ports.push(port);

    // Tag the 2 vertices with the port
    vertices[edge.v1].port = template.type;
    vertices[edge.v2].port = template.type;
  });

  return {
    hexes,
    vertices,
    edges,
    ports,
    robberHexId: desertHexId,
  };
}
