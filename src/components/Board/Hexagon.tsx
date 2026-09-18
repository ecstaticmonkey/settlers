'use client';

import React from 'react';
import { Hex, HexTerrain } from '@/lib/catan/types';
import { TERRAIN_COLORS } from '@/lib/catan/board';

interface HexagonProps {
  hex: Hex;
  isRobberMoveTarget?: boolean;
  onSelectHex?: (hexId: number) => void;
}

export const Hexagon: React.FC<HexagonProps> = ({
  hex,
  isRobberMoveTarget,
  onSelectHex,
}) => {
  const pointsString = React.useMemo(() => {
    // Generate the 6 corner points for SVG polygon
    const corners: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i + 30);
      const x = hex.pixelX + 60 * Math.cos(angleRad);
      const y = hex.pixelY + 60 * Math.sin(angleRad);
      corners.push(`${x},${y}`);
    }
    return corners.join(' ');
  }, [hex.pixelX, hex.pixelY]);

  const terrainConfig = TERRAIN_COLORS[hex.terrain];

  // Render thematic terrain backdrop icon/pattern
  const renderTerrainIcon = () => {
    const cx = hex.pixelX;
    const cy = hex.pixelY - 14;

    switch (hex.terrain) {
      case 'forest':
        return (
          <g opacity="0.35" fill="#143621">
            <polygon points={`${cx},${cy - 12} ${cx - 9},${cy + 4} ${cx + 9},${cy + 4}`} />
            <polygon points={`${cx},${cy - 6} ${cx - 12},${cy + 12} ${cx + 12},${cy + 12}`} />
            <rect x={cx - 2} y={cy + 12} width="4" height="6" fill="#0d2416" />
          </g>
        );
      case 'hills':
        return (
          <g opacity="0.4" fill="#541b1f">
            <path d={`M ${cx - 18} ${cy + 14} Q ${cx - 8} ${cy - 8} ${cx + 2} ${cy + 14} Z`} />
            <path d={`M ${cx - 4} ${cy + 14} Q ${cx + 8} ${cy - 4} ${cx + 18} ${cy + 14} Z`} />
          </g>
        );
      case 'fields':
        return (
          <g opacity="0.4" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
            <line x1={cx - 10} y1={cy + 12} x2={cx} y2={cy - 8} />
            <line x1={cx} y1={cy - 8} x2={cx - 6} y2={cy - 12} />
            <line x1={cx} y1={cy - 8} x2={cx + 6} y2={cy - 12} />
            <line x1={cx + 10} y1={cy + 12} x2={cx} y2={cy - 8} />
          </g>
        );
      case 'pasture':
        return (
          <g opacity="0.35" fill="#2d6a4f">
            {/* Gentle grass tufts */}
            <path d={`M ${cx - 12} ${cy + 10} Q ${cx - 6} ${cy} ${cx} ${cy + 10} Z`} />
            <path d={`M ${cx} ${cy + 10} Q ${cx + 6} ${cy + 2} ${cx + 12} ${cy + 10} Z`} />
          </g>
        );
      case 'mountains':
        return (
          <g opacity="0.4" fill="#343a40">
            <polygon points={`${cx - 14},${cy + 14} ${cx - 2},${cy - 12} ${cx + 10},${cy + 14}`} />
            <polygon points={`${cx - 2},${cy - 12} ${cx + 2},${cy - 4} ${cx - 6},${cy - 4}`} fill="#f8f9fa" />
            <polygon points={`${cx},${cy + 14} ${cx + 12},${cy - 6} ${cx + 20},${cy + 14}`} fill="#495057" />
          </g>
        );
      case 'desert':
        return (
          <g opacity="0.4" fill="#b08968">
            <ellipse cx={cx} cy={cy + 8} rx="16" ry="6" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <g
      className={`transition-all duration-200 ${
        isRobberMoveTarget ? 'cursor-pointer hover:brightness-125' : ''
      }`}
      onClick={() => {
        if (isRobberMoveTarget && onSelectHex) {
          onSelectHex(hex.id);
        }
      }}
    >
      {/* Hex background with subtle 3D border */}
      <polygon
        points={pointsString}
        fill={terrainConfig.bg}
        stroke={isRobberMoveTarget ? '#38bdf8' : terrainConfig.stroke}
        strokeWidth={isRobberMoveTarget ? 3.5 : 2}
        className="transition-colors drop-shadow-sm"
      />

      {/* Thematic icon */}
      {renderTerrainIcon()}

      {/* Robber Move Target Highlight indicator */}
      {isRobberMoveTarget && (
        <circle
          cx={hex.pixelX}
          cy={hex.pixelY}
          r="26"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
          strokeDasharray="4 4"
          className="animate-spin"
          style={{ transformOrigin: `${hex.pixelX}px ${hex.pixelY}px`, animationDuration: '6s' }}
        />
      )}
    </g>
  );
};
