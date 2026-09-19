'use client';

import React from 'react';
import { Hex } from '@/lib/catan/types';
import { TERRAIN_COLORS } from '@/lib/catan/board';
import { FLAT_TERRAIN, TerrainIllustration, tilePoints } from './FlatBoardArt';

interface HexagonProps {
  hex: Hex;
  isRobberMoveTarget?: boolean;
  onSelectHex?: (hexId: number) => void;
}

export const Hexagon: React.FC<HexagonProps> = ({ hex, isRobberMoveTarget, onSelectHex }) => {
  const { pixelX: x, pixelY: y, terrain } = hex;
  const palette = FLAT_TERRAIN[terrain];
  const select = () => { if (isRobberMoveTarget) onSelectHex?.(hex.id); };

  return (
    <g className={`flat-hex ${isRobberMoveTarget ? 'flat-hex-target' : ''}`}
      role={isRobberMoveTarget ? 'button' : undefined}
      tabIndex={isRobberMoveTarget ? 0 : undefined}
      aria-label={`${TERRAIN_COLORS[terrain].label}${hex.numberToken ? `, ${hex.numberToken}` : ''}${isRobberMoveTarget ? '. Move robber here' : ''}`}
      onClick={select}
      onKeyDown={event => {
        if (isRobberMoveTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault(); select();
        }
      }}>
      <title>{TERRAIN_COLORS[terrain].label}{hex.numberToken ? ` · ${hex.numberToken}` : ''}</title>
      <polygon points={tilePoints(x, y, 59.6)} fill="var(--flat-sand)" stroke="var(--flat-sand-edge)" strokeWidth="1.2" />
      <polygon points={tilePoints(x, y, 55.5)} fill={palette.shade} stroke="var(--flat-sand-light)" strokeWidth="1.5" />
      <polygon points={tilePoints(x, y - 1, 51.5)} fill={palette.fill} />
      <path d={`M${x - 44.6} ${y + 24.7}V${y - 26.7}L${x} ${y - 52.5}L${x + 44.6} ${y - 26.7}`}
        fill="none" stroke="#fff4cb" strokeOpacity=".3" strokeWidth="1.5" />
      <g transform={`translate(${x}, ${y - (terrain === 'desert' ? 0 : 21)}) scale(.7)`} pointerEvents="none">
        <ellipse cy="19" rx="23" ry="3" fill={palette.ink} opacity=".12" />
        <TerrainIllustration terrain={terrain} />
      </g>
      {terrain === 'fields' ? (
        <g stroke={palette.ink} strokeWidth="1.2" strokeDasharray="3.5 3.5" opacity=".32" fill="none" pointerEvents="none">
          <path d={`M${x - 34} ${y - 16} Q${x} ${y - 11} ${x + 34} ${y - 16}`} />
          <path d={`M${x - 40} ${y + 2} Q${x} ${y + 7} ${x + 40} ${y + 2}`} />
          <path d={`M${x - 34} ${y + 20} Q${x} ${y + 25} ${x + 34} ${y + 20}`} />
          <path d={`M${x - 24} ${y + 35} Q${x} ${y + 39} ${x + 24} ${y + 35}`} />
        </g>
      ) : terrain === 'pasture' ? (
        <g stroke={palette.ink} strokeWidth="1.1" opacity=".28" fill="none" strokeLinecap="round" pointerEvents="none">
          <path d={`M${x - 28} ${y + 24}l2-5m-2 5l-2-4M${x + 26} ${y + 22}l2-5m-2 5l-2-4`} />
        </g>
      ) : (
        <g stroke={palette.ink} strokeWidth="1.2" opacity=".27" fill="none" strokeLinecap="round" pointerEvents="none">
          <path d={`M${x - 34} ${y - 6}l-4-3m4 3v-5m0 5l4-2M${x + 31} ${y - 9}l-3-3m3 3l2-5m-2 5h5`} />
          <path d={`M${x - 31} ${y + 26}l5-2m49-1l5 2`} />
        </g>
      )}
      {isRobberMoveTarget && <polygon className="flat-hex-focus" points={tilePoints(x, y, 54)} fill="none" stroke="var(--sea)" strokeWidth="3" strokeDasharray="5 4" pointerEvents="none" />}
    </g>
  );
};
