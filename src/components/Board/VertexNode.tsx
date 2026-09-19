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

import { PLAYER_TOKENS } from '@/lib/catan/tokens';

const COLOR_MAP: Record<PlayerColor, { fill: string; stroke: string }> = PLAYER_TOKENS;

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
        {/* Clean solid wooden house shape */}
        <polygon
          points={`${x},${y - 13} ${x + 9},${y - 4} ${x + 9},${y + 8} ${x - 9},${y + 8} ${x - 9},${y - 4}`}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Roof facets retain the player's color while reading as a wooden piece. */}
        <path d={`M${x} ${y - 13}L${x + 9} ${y - 4}V${y + 8}L${x} ${y + 3}Z`} fill="#0c2744" opacity=".2" />
        <path d={`M${x - 9} ${y - 4}L${x} ${y - 13}V${y + 3}L${x - 9} ${y + 8}Z`} fill="#ffffff" opacity=".13" />
        <path d={`M${x} ${y - 12}V${y + 2}M${x - 8} ${y + 7}L${x} ${y + 2}L${x + 8} ${y + 7}`} fill="none" stroke={stroke} strokeWidth="1" />
        {/* Timber door detail */}
        <rect x={x - 2.5} y={y + 1} width="5" height="7" fill="#3e2723" rx="0.5" />
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
        {/* Double-roof city silhouette is distinct from the smaller settlement. */}
        <path
          d={`M${x - 14} ${y + 9}V${y - 8}L${x - 5} ${y - 17}L${x + 4} ${y - 8}V${y - 1}L${x + 8} ${y - 5}L${x + 16} ${y + 1}V${y + 10}Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d={`M${x - 5} ${y - 16}V${y + 6}L${x + 4} ${y + 10}V${y - 8}Z`} fill="#0c2744" opacity=".22" />
        <path d={`M${x - 13} ${y - 8}L${x - 5} ${y - 16}V${y + 5}L${x - 13} ${y + 8}Z`} fill="#ffffff" opacity=".16" />
        <path d={`M${x + 4} ${y + 1}H${x + 15}M${x - 5} ${y - 15}V${y + 5}`} fill="none" stroke={stroke} strokeWidth="1.2" />
        <rect x={x - 10} y={y + 1} width="4" height="6" rx=".6" fill={stroke} />
        <rect x={x + 8} y={y + 4} width="4" height="3" rx=".5" fill={stroke} />
      </g>
    );
  };

  return (
    <g
      className={`transition-all duration-150 ${isClickable ? 'flat-placement group' : ''}`}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `${isUpgradableCity ? 'Upgrade city' : 'Place settlement'} at intersection ${vertex.id + 1}` : undefined}
      onKeyDown={(event) => {
        if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelectVertex?.(vertex.id);
        }
      }}
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
              className="flat-placement-ring opacity-75"
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
            className="opacity-30 group-hover:opacity-90 transition-all"
          />
          {/* Inner ring */}
          <circle
            cx={vertex.pixelX}
            cy={vertex.pixelY}
            r="6"
            fill="#ffffff"
            stroke={COLOR_MAP[hoverColor].fill}
            strokeWidth="2.5"
            className="flat-placement-ring"
          />
        </g>
      )}
    </g>
  );
};
