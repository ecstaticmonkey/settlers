'use client';

import React from 'react';
import { GameBoard, GamePhase, Player } from '@/lib/catan/types';
import {
  isVertexDistanceRuleSatisfied,
  isVertexConnectedToPlayerRoad,
  isEdgeConnectedToPlayerNetwork,
} from '@/lib/catan/engine';
import { Hexagon } from './Hexagon';
import { NumberToken, RobberPawn } from './NumberToken';
import { EdgeLine } from './EdgeLine';
import { VertexNode } from './VertexNode';
import { PortMarker } from './PortMarker';
import './flat-board.css';

interface CatanBoardProps {
  board: GameBoard;
  phase: GamePhase;
  activePlayer: Player;
  currentPlayerId: string; // The user looking at the screen
  buildMode: 'road' | 'settlement' | 'city' | null;
  lastPlacedVertexId: number | null;
  onSelectVertex: (vertexId: number) => void;
  onSelectEdge: (edgeId: number) => void;
  onSelectHex: (hexId: number) => void;
}

export const FlatBoard: React.FC<CatanBoardProps> = ({
  board,
  phase,
  activePlayer,
  currentPlayerId,
  buildMode,
  lastPlacedVertexId,
  onSelectVertex,
  onSelectEdge,
  onSelectHex,
}) => {
  const isMyTurn = activePlayer.id === currentPlayerId;

  // Compute which vertices are valid for placement
  const validVertexIds = React.useMemo(() => {
    if (!isMyTurn) return new Set<number>();

    // Initial setup settlements
    if (phase === 'SETUP_ROUND_1_SETTLEMENT' || phase === 'SETUP_ROUND_2_SETTLEMENT') {
      const valid = new Set<number>();
      board.vertices.forEach((v) => {
        if (!v.building && isVertexDistanceRuleSatisfied(board, v.id)) {
          valid.add(v.id);
        }
      });
      return valid;
    }

    // Normal game settlement build
    if (phase === 'TURN_ACTIONS' && buildMode === 'settlement') {
      const valid = new Set<number>();
      board.vertices.forEach((v) => {
        if (
          !v.building &&
          isVertexDistanceRuleSatisfied(board, v.id) &&
          isVertexConnectedToPlayerRoad(board, v.id, activePlayer.id)
        ) {
          valid.add(v.id);
        }
      });
      return valid;
    }

    return new Set<number>();
  }, [isMyTurn, phase, buildMode, board, activePlayer.id]);

  // Compute which settlements can be upgraded to cities
  const upgradableCityVertexIds = React.useMemo(() => {
    if (!isMyTurn || phase !== 'TURN_ACTIONS' || buildMode !== 'city') {
      return new Set<number>();
    }
    const valid = new Set<number>();
    board.vertices.forEach((v) => {
      if (v.building?.type === 'settlement' && v.building.playerId === activePlayer.id) {
        valid.add(v.id);
      }
    });
    return valid;
  }, [isMyTurn, phase, buildMode, board.vertices, activePlayer.id]);

  // Compute which edges are valid for road placement
  const validEdgeIds = React.useMemo(() => {
    if (!isMyTurn) return new Set<number>();

    // Setup road placement: must connect to the settlement just placed!
    if (phase === 'SETUP_ROUND_1_ROAD' || phase === 'SETUP_ROUND_2_ROAD') {
      if (lastPlacedVertexId === null) return new Set<number>();
      const v = board.vertices[lastPlacedVertexId];
      if (!v) return new Set<number>();

      const valid = new Set<number>();
      v.adjacentEdgeIds.forEach((eId) => {
        if (!board.edges[eId]?.road) {
          valid.add(eId);
        }
      });
      return valid;
    }

    // Normal road build
    if (phase === 'TURN_ACTIONS' && buildMode === 'road') {
      const valid = new Set<number>();
      board.edges.forEach((e) => {
        if (!e.road && isEdgeConnectedToPlayerNetwork(board, e.id, activePlayer.id)) {
          valid.add(e.id);
        }
      });
      return valid;
    }

    return new Set<number>();
  }, [isMyTurn, phase, buildMode, lastPlacedVertexId, board, activePlayer.id]);

  // Robber placement targets
  const isRobberMoving = isMyTurn && phase === 'TURN_ROBBER_MOVE';
  const robberHex = board.hexes.find((h) => h.id === board.robberHexId);

  const coastline = React.useMemo(() => {
    const remaining = new Set(board.edges.filter(edge => edge.adjacentHexIds.length === 1));
    const first = remaining.values().next().value;
    if (!first) return '';
    const start = board.vertices[first.v1];
    let vertexId = first.v1;
    let path = `M${start.pixelX} ${start.pixelY}`;
    while (remaining.size) {
      const next = [...remaining].find(edge => edge.v1 === vertexId || edge.v2 === vertexId);
      if (!next) break;
      remaining.delete(next);
      vertexId = next.v1 === vertexId ? next.v2 : next.v1;
      const vertex = board.vertices[vertexId];
      path += `L${vertex.pixelX} ${vertex.pixelY}`;
    }
    return `${path}Z`;
  }, [board.edges, board.vertices]);

  return (
    <div className="flat-board-container select-none">
      <svg
        viewBox="110 65 680 660"
        className="flat-board-svg"
        role="group"
        aria-label="Top-down Catan island board"
      >
        <title>The island · top-down view</title>
        {/* Connected coastal outline follows the actual playable island. */}
        <g fill="var(--flat-sand)" strokeLinejoin="round" pointerEvents="none">
          <path d={coastline} stroke="#4aa7bb" strokeWidth="32" strokeOpacity=".24" />
          <path d={coastline} stroke="#6dbdc6" strokeWidth="24" strokeOpacity=".6" />
          <path d={coastline} stroke="#bee3dc" strokeWidth="17" />
          <path d={coastline} stroke="var(--flat-sand-light)" strokeWidth="11" />
        </g>

        {/* 1. Hexagons Layer */}
        <g id="hexes-layer">
          {board.hexes.map((hex) => (
            <Hexagon
              key={`hex-${hex.id}`}
              hex={hex}
              isRobberMoveTarget={isRobberMoving && hex.id !== board.robberHexId}
              onSelectHex={onSelectHex}
            />
          ))}
        </g>

        {/* 2. Ports Layer */}
        <g id="ports-layer">
          {board.ports.map((port) => (
            <PortMarker key={`port-${port.id}`} port={port} vertices={board.vertices} />
          ))}
        </g>

        {/* 3. Number Tokens Layer */}
        <g id="tokens-layer">
          {board.hexes.map((hex) => {
            if (hex.numberToken === null) return null;
            return (
              <NumberToken
                key={`token-${hex.id}`}
                number={hex.numberToken}
                pixelX={hex.pixelX}
                pixelY={hex.pixelY}
                blockedByRobber={hex.hasRobber}
              />
            );
          })}
        </g>

        {/* 4. Edges / Roads Layer */}
        <g id="edges-layer">
          {board.edges.map((edge) => (
            <EdgeLine
              key={`edge-${edge.id}`}
              edge={edge}
              isValidPlacement={validEdgeIds.has(edge.id)}
              onSelectEdge={onSelectEdge}
              hoverColor={activePlayer.color}
            />
          ))}
        </g>

        {/* 5. Vertices / Settlements / Cities Layer */}
        <g id="vertices-layer">
          {board.vertices.map((vertex) => (
            <VertexNode
              key={`vertex-${vertex.id}`}
              vertex={vertex}
              isValidPlacement={validVertexIds.has(vertex.id)}
              isUpgradableCity={upgradableCityVertexIds.has(vertex.id)}
              onSelectVertex={onSelectVertex}
              hoverColor={activePlayer.color}
            />
          ))}
        </g>

        {/* 6. Robber Pawn */}
        {robberHex && (
          <g id="robber-layer">
            <RobberPawn pixelX={robberHex.pixelX} pixelY={robberHex.pixelY} />
          </g>
        )}
      </svg>
    </div>
  );
};

