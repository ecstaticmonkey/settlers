'use client';

import React from 'react';
import { Vertex, PlayerColor } from '@/lib/catan/types';

interface VertexNodeProps {
  vertex: Vertex;
  isValidPlacement?: boolean;
  isUpgradableCity?: boolean;
  onSelectVertex?: (vertexId: number) => void;
  hoverColor?: PlayerColor;
}

const COLOR_MAP: Record<PlayerColor, { fill: string; stroke: string }> = {
  red: { fill: '#dc2626', stroke: '#7f1d1d' },
  blue: { fill: '#2563eb', stroke: '#1e3a8a' },
  orange: { fill: '#ea580c', stroke: '#7c2d12' },
  white: { fill: '#f8fafc', stroke: '#475569' },
  green: { fill: '#16a34a', stroke: '#14532d' },
};

export const VertexNode: React.FC<VertexNodeProps> = ({
  vertex,
  isValidPlacement,
  isUpgradableCity,
  onSelectVertex,
  hoverColor = 'orange',
}) => {
  const building = vertex.building;
  const isOccupied = Boolean(building);
  const isClickable = isValidPlacement || isUpgradableCity;

  // Render Settlement House SVG
  const renderSettlement = (color: PlayerColor) => {
    const { fill, stroke } = COLOR_MAP[color];
    const x = vertex.pixelX;
    const y = vertex.pixelY;

    return (
      <g
        filter="drop-shadow(0 2px 3px rgba(0,0,0,0.4))"
        transform={`translate(${x}, ${y}) scale(1.35) translate(${-x}, ${-y})`}
      >
        {/* House shape */}
        <polygon
          points={`${x},${y - 13} ${x + 9},${y - 4} ${x + 9},${y + 8} ${x - 9},${y + 8} ${x - 9},${y - 4}`}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        {/* Window/door detail */}
        <rect x={x - 2.5} y={y + 1} width="5" height="7" fill={stroke} />
      </g>
    );
  };

  // Render City Castle SVG
  const renderCity = (color: PlayerColor) => {
    const { fill, stroke } = COLOR_MAP[color];
    const x = vertex.pixelX;
    const y = vertex.pixelY;

    return (
      <g
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.45))"
        transform={`translate(${x}, ${y}) scale(1.35) translate(${-x}, ${-y})`}
      >
        {/* City castle shape: taller left tower and wider right base */}
        <path
          d={`M ${x - 12} ${y + 9} 
              L ${x - 12} ${y - 8} 
              L ${x - 8} ${y - 8} 
              L ${x - 8} ${y - 4} 
              L ${x - 4} ${y - 4} 
              L ${x - 4} ${y - 14} 
              L ${x} ${y - 14} 
              L ${x} ${y - 10} 
              L ${x + 4} ${y - 10} 
              L ${x + 4} ${y - 4} 
              L ${x + 12} ${y - 4} 
              L ${x + 12} ${y + 9} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
        />
      </g>
    );
  };

  return (
    <g
      className={`transition-all duration-150 ${isClickable ? 'cursor-pointer group' : ''}`}
      onClick={() => {
        if (isClickable && onSelectVertex) {
          onSelectVertex(vertex.id);
        }
      }}
    >
      {/* Invisible wider hit target */}
      {isClickable && (
        <circle cx={vertex.pixelX} cy={vertex.pixelY} r="18" fill="transparent" />
      )}

      {/* Existing Building */}
      {isOccupied && building && (
        <>
          {building.type === 'settlement' && renderSettlement(building.playerColor)}
          {building.type === 'city' && renderCity(building.playerColor)}

          {/* Upgradable city pulse indicator */}
          {isUpgradableCity && (
            <circle
              cx={vertex.pixelX}
              cy={vertex.pixelY}
              r="16"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
              className="animate-ping opacity-75"
            />
          )}
        </>
      )}

      {/* Vacant spot valid settlement placement indicator */}
      {!isOccupied && isValidPlacement && (
        <g>
          {/* Subtle outer glow */}
          <circle
            cx={vertex.pixelX}
            cy={vertex.pixelY}
            r="10"
            fill={COLOR_MAP[hoverColor].fill}
            className="opacity-30 group-hover:opacity-90 transition-all group-hover:scale-125 origin-center"
          />
          {/* Inner ring */}
          <circle
            cx={vertex.pixelX}
            cy={vertex.pixelY}
            r="6"
            fill="#ffffff"
            stroke={COLOR_MAP[hoverColor].fill}
            strokeWidth="2.5"
            className="group-hover:scale-125 transition-transform origin-center"
          />
        </g>
      )}
    </g>
  );
};
