'use client';

import React from 'react';
import { Edge, PlayerColor } from '@/lib/catan/types';

interface EdgeLineProps {
  edge: Edge;
  isValidPlacement?: boolean;
  onSelectEdge?: (edgeId: number) => void;
  hoverColor?: PlayerColor;
}

import { PLAYER_TOKENS } from '@/lib/catan/tokens';

const COLOR_MAP: Record<PlayerColor, { fill: string; stroke: string }> = PLAYER_TOKENS;

export const EdgeLine: React.FC<EdgeLineProps> = ({
  edge,
  isValidPlacement,
  onSelectEdge,
  hoverColor = 'orange',
}) => {
  const road = edge.road;
  const isOccupied = Boolean(road);

  return (
    <g
      className={`transition-all duration-150 ${
        isValidPlacement ? 'flat-placement group' : ''
      }`}
      role={isValidPlacement ? 'button' : undefined}
      tabIndex={isValidPlacement ? 0 : undefined}
      aria-label={isValidPlacement ? `Place road on path ${edge.id + 1}` : undefined}
      onKeyDown={(event) => {
        if (isValidPlacement && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelectEdge?.(edge.id);
        }
      }}
      onClick={() => {
        if (isValidPlacement && onSelectEdge) {
          onSelectEdge(edge.id);
        }
      }}
    >
      {/* Invisible wide hit box for easy clicking */}
      {isValidPlacement && (
        <line
          x1={edge.pixelX1}
          y1={edge.pixelY1}
          x2={edge.pixelX2}
          y2={edge.pixelY2}
          stroke="transparent"
          strokeWidth="24"
          strokeLinecap="round"
        />
      )}

      {/* If road is built: clean solid wooden road bar */}
      {isOccupied && road && (
        <g filter="drop-shadow(0 2px 1px rgba(0,0,0,0.25))">
          <line
            x1={edge.pixelX1} y1={edge.pixelY1} x2={edge.pixelX2} y2={edge.pixelY2}
            stroke={COLOR_MAP[road.playerColor].stroke} strokeWidth="10" strokeLinecap="round"
          />
          {/* Main road body */}
          <line
            x1={edge.pixelX1}
            y1={edge.pixelY1}
            x2={edge.pixelX2}
            y2={edge.pixelY2}
            stroke={COLOR_MAP[road.playerColor].fill}
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Inner subtle highlight line */}
          <line
            x1={edge.pixelX1}
            y1={edge.pixelY1}
            x2={edge.pixelX2}
            y2={edge.pixelY2}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.25"
          />
        </g>
      )}

      {/* Valid placement ghost / hover indicator */}
      {!isOccupied && isValidPlacement && (
        <>
          <line
            x1={edge.pixelX1}
            y1={edge.pixelY1}
            x2={edge.pixelX2}
            y2={edge.pixelY2}
            stroke={COLOR_MAP[hoverColor].fill}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="6 4"
            className="flat-road-ghost opacity-60 group-hover:opacity-100 transition-all"
          />
        </>
      )}
    </g>
  );
};
