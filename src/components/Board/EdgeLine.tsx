'use client';

import React from 'react';
import { Edge, PlayerColor } from '@/lib/catan/types';

interface EdgeLineProps {
  edge: Edge;
  isValidPlacement?: boolean;
  onSelectEdge?: (edgeId: number) => void;
  hoverColor?: PlayerColor;
}

const COLOR_MAP: Record<PlayerColor, { fill: string; stroke: string }> = {
  red: { fill: '#dc2626', stroke: '#991b1b' },
  blue: { fill: '#2563eb', stroke: '#1e40af' },
  orange: { fill: '#ea580c', stroke: '#9a3412' },
  white: { fill: '#f8fafc', stroke: '#94a3b8' },
  green: { fill: '#16a34a', stroke: '#15803d' },
};

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
        isValidPlacement ? 'cursor-pointer group' : ''
      }`}
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

      {/* If road is built */}
      {isOccupied && road && (
        <g filter="drop-shadow(0 2px 2px rgba(0,0,0,0.35))">
          {/* Main road body */}
          <line
            x1={edge.pixelX1}
            y1={edge.pixelY1}
            x2={edge.pixelX2}
            y2={edge.pixelY2}
            stroke={COLOR_MAP[road.playerColor].fill}
            strokeWidth="7.5"
            strokeLinecap="round"
          />
          {/* Inner highlight line */}
          <line
            x1={edge.pixelX1}
            y1={edge.pixelY1}
            x2={edge.pixelX2}
            y2={edge.pixelY2}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
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
            className="opacity-40 group-hover:opacity-100 group-hover:stroke-width-[8px] transition-all animate-pulse"
          />
        </>
      )}
    </g>
  );
};
