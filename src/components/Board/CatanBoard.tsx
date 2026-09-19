'use client';

import React from 'react';
import { GameBoard, GamePhase, Player } from '@/lib/catan/types';
import {
  isVertexDistanceRuleSatisfied,
  isVertexConnectedToPlayerRoad,
  isEdgeConnectedToPlayerNetwork,
} from '@/lib/catan/engine';
import dynamic from 'next/dynamic';
import { FlatBoard } from './FlatBoard';
import { ResourceIcon } from '../UI/ResourceIcon';
import { Anchor, Box } from 'lucide-react';
const IslandCanvas = dynamic(() => import('./IslandCanvas'), { ssr: false, loading: () => <div className="island-loading"><span/>Charting your island…</div> });

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
  viewMode?: '3d' | '2d';
  onToggleViewMode?: () => void;
}

export const CatanBoard: React.FC<CatanBoardProps> = ({
  board,
  phase,
  activePlayer,
  currentPlayerId,
  buildMode,
  lastPlacedVertexId,
  onSelectVertex,
  onSelectEdge,
  onSelectHex,
  viewMode: propViewMode,
  onToggleViewMode: propToggleViewMode,
}) => {
  const [internalViewMode, setInternalViewMode] = React.useState<'3d' | '2d'>('3d');

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('catan_view_mode');
      if (saved === '2d' || saved === '3d') {
        setInternalViewMode(saved);
      }
    } catch {}
  }, []);

  const activeView = propViewMode ?? internalViewMode;

  const handleToggleMode = () => {
    if (propToggleViewMode) {
      propToggleViewMode();
    } else {
      const next = activeView === '3d' ? '2d' : '3d';
      setInternalViewMode(next);
      try {
        localStorage.setItem('catan_view_mode', next);
      } catch {}
    }
  };

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


  if (activeView === '2d') {
    return (
      <div className="flat-board-root">
        <FlatBoard {...{ board, phase, activePlayer, currentPlayerId, buildMode, lastPlacedVertexId, onSelectVertex, onSelectEdge, onSelectHex }} />
        <div className="board-camera-bar">
          <div className="camera-hint">
            <span>2D Top-Down View</span>
          </div>
          <div className="camera-controls" aria-label="Board camera">
            <button
              onClick={handleToggleMode}
              className="camera-mode-btn"
              title="Switch to 3D Island View"
              aria-label="Switch to 3D Island View"
            >
              <Box size={14} />
              <span>3D View</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fallback = <FlatBoard {...{ board, phase, activePlayer, currentPlayerId, buildMode, lastPlacedVertexId, onSelectVertex, onSelectEdge, onSelectHex }} />;
  return <IslandCanvas board={board} fallback={fallback} onToggleViewMode={handleToggleMode}>
    {board.hexes.map(hex => <button key={`hex-${hex.id}`} data-world-x={hex.pixelX} data-world-z={hex.pixelY + 20} data-world-y=".27" className={`number-marker ${hex.pips === 5 ? 'number-hot' : ''} ${hex.hasRobber ? 'number-blocked' : ''} ${isRobberMoving && !hex.hasRobber ? 'robber-target' : ''}`} disabled={!isRobberMoving || hex.hasRobber} onPointerDown={(e) => { if (isRobberMoving && !hex.hasRobber) e.stopPropagation(); }} onClick={() => onSelectHex(hex.id)} aria-label={`${hex.terrain}, ${hex.numberToken || 'desert'}${hex.hasRobber ? ', robber' : ''}${isRobberMoving && !hex.hasRobber ? '. Move robber here' : ''}`}>
      <span className="number-val">{hex.numberToken || <span className="desert-mark">✦</span>}</span>
      {hex.numberToken !== null && (
        <span className="number-pips" aria-label={`${hex.pips} pips`}>
          {Array.from({ length: hex.pips }).map((_, i) => (
            <span key={i} className="pip-dot" />
          ))}
        </span>
      )}
    </button>)}
    {board.ports.map(port => <span key={`port-${port.id}`} className="port-label" data-world-x={port.pixelX} data-world-z={port.pixelY} data-world-y=".05" title={port.label}>{port.resource ? <ResourceIcon resource={port.resource} size={11}/> : <Anchor size={11}/>} {port.ratio}:1</span>)}
    {board.vertices.filter(vertex => validVertexIds.has(vertex.id) || upgradableCityVertexIds.has(vertex.id)).map(vertex => (
      <button
        key={`vertex-${vertex.id}`}
        type="button"
        className={`placement-target ${upgradableCityVertexIds.has(vertex.id) ? 'city-target' : ''}`}
        data-world-x={vertex.pixelX}
        data-world-z={vertex.pixelY}
        data-world-y=".28"
        aria-label={`${upgradableCityVertexIds.has(vertex.id) ? 'Upgrade city' : 'Place settlement'} at intersection ${vertex.id + 1}`}
        onPointerDown={(evt) => {
          evt.stopPropagation();
        }}
        onMouseDown={(evt) => {
          evt.stopPropagation();
        }}
        onClick={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          onSelectVertex(vertex.id);
        }}
      >
        <span aria-hidden="true">+</span>
      </button>
    ))}
    {board.edges.filter(edge => validEdgeIds.has(edge.id)).map(edge => (
      <button
        key={`edge-${edge.id}`}
        type="button"
        className="placement-target road-target"
        data-world-x={(edge.pixelX1 + edge.pixelX2)/2}
        data-world-z={(edge.pixelY1 + edge.pixelY2)/2}
        data-world-y=".28"
        aria-label={`Place road on path ${edge.id + 1}`}
        onPointerDown={(evt) => {
          evt.stopPropagation();
        }}
        onMouseDown={(evt) => {
          evt.stopPropagation();
        }}
        onClick={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          onSelectEdge(edge.id);
        }}
      >
        <span aria-hidden="true">+</span>
      </button>
    ))}
    {board.vertices.filter(v => v.building).map(v => (
      <div key={`building-${v.id}`} className="building-marker-wrap" data-world-x={v.pixelX} data-world-z={v.pixelY} data-world-y=".58">
        {lastPlacedVertexId === v.id && <span className="building-vp-pill">+1 🏆</span>}
      </div>
    ))}
  </IslandCanvas>;
};
