import React from 'react';
import { HexTerrain } from '@/lib/catan/types';
import { getHexCornerPoints } from '@/lib/catan/board';

import { TERRAIN_TOKENS } from '@/lib/catan/tokens';

// Shared illustration colors keep terrain tiles and trading sails consistent.
export const FLAT_TERRAIN: Record<HexTerrain, { fill: string; shade: string; ink: string }> = {
  forest: { fill: TERRAIN_TOKENS.forest.fill2D, shade: TERRAIN_TOKENS.forest.shade2D, ink: TERRAIN_TOKENS.forest.ink2D },
  pasture: { fill: TERRAIN_TOKENS.pasture.fill2D, shade: TERRAIN_TOKENS.pasture.shade2D, ink: TERRAIN_TOKENS.pasture.ink2D },
  fields: { fill: TERRAIN_TOKENS.fields.fill2D, shade: TERRAIN_TOKENS.fields.shade2D, ink: TERRAIN_TOKENS.fields.ink2D },
  hills: { fill: TERRAIN_TOKENS.hills.fill2D, shade: TERRAIN_TOKENS.hills.shade2D, ink: TERRAIN_TOKENS.hills.ink2D },
  mountains: { fill: TERRAIN_TOKENS.mountains.fill2D, shade: TERRAIN_TOKENS.mountains.shade2D, ink: TERRAIN_TOKENS.mountains.ink2D },
  desert: { fill: TERRAIN_TOKENS.desert.fill2D, shade: TERRAIN_TOKENS.desert.shade2D, ink: TERRAIN_TOKENS.desert.ink2D },
};

export function tilePoints(x: number, y: number, radius: number) {
  return getHexCornerPoints(x, y, radius).map(point => `${point.x},${point.y}`).join(' ');
}

/** Original vector artwork, shared by the terrain tiles and port sails. */
export function TerrainIllustration({ terrain }: { terrain: HexTerrain }) {
  switch (terrain) {
    case 'forest':
      return <g stroke="#0f3d1f" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M-3 10H3V21H-3Z" fill="#5c2b09" />
        <path d="M0-22L-11-8H-6L-16 5H-9L-20 17H20L9 5H16L6-8H11Z" fill="#1e6b3b" />
        <path d="M0-18V14H15L6 4H11L2-9H7Z" fill="#154e2a" stroke="none" />
        <path d="M-10 5H-4M-6-7H-2" stroke="#2ebb68" strokeLinecap="round" />
      </g>;
    case 'pasture':
      return <g strokeLinejoin="round">
        {/* Contrasting dark earthen grazing base shadow beneath hooves */}
        <ellipse cx="2" cy="18" rx="20" ry="5" fill="#1a3325" opacity=".45" />
        {/* High-contrast charcoal legs and hooves */}
        <path d="M-11 7L-12 18H-8L-7 8M8 7L9 18H13L13 5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
        {/* Crisp off-white sheep wool body with strong dark silhouette contour */}
        <path d="M-17 0Q-21-8-13-10Q-11-17-4-13Q2-18 7-12Q16-14 18-6Q22 1 14 7Q8 14 2 10Q-7 15-11 9Q-20 10-17 0Z"
          fill="#fcfbf7" stroke="#1e293b" strokeWidth="1.8" />
        {/* Charcoal face & ears */}
        <path d="M12-7Q25-13 24-3L22 8Q15 13 13 4Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
        <path d="M15-9L11-14L9-8M23-8L29-11L27-5" fill="#334155" stroke="#1e293b" strokeWidth="1" />
        <circle cx="20" cy="-1.5" r="1.1" fill="#f8fafc" stroke="none" />
        <path d="M-15-2Q-12-7-6-5" fill="none" stroke="#e2e8f0" strokeWidth="1.2" strokeLinecap="round" />
      </g>;
    case 'fields':
      return <g strokeLinecap="round" strokeLinejoin="round">
        {/* Dense wheat sheaf with vertical stalks, bundling ribbon, and warm golden amber ears */}
        {/* Stalks base & tie */}
        <path d="M-6 22L-2 6L-4-18M0 22V-22M6 22L2 6L4-18" stroke="#6c4405" strokeWidth="1.8" fill="none" />
        <path d="M-12 22L-4 7M12 22L4 7" stroke="#8c5918" strokeWidth="1.5" fill="none" />
        {/* Binding ribbon band */}
        <rect x="-8" y="4" width="16" height="5" rx="1.5" fill="#a16207" stroke="#451a03" strokeWidth="1.2" />
        {/* Dense vertical wheat grain clusters in rows */}
        {[-16, -9, -2, 5, 12].map((y, idx) => (
          <g key={y} fill={idx % 2 === 0 ? '#f3b73e' : '#e5a025'} stroke="#6c4405" strokeWidth="1.2">
            <path d={`M-1 ${y + 4}Q-9 ${y + 1}-5 ${y - 4}Q0 ${y - 3}0 ${y + 4}Z`} />
            <path d={`M1 ${y + 4}Q9 ${y + 1}5 ${y - 4}Q0 ${y - 3}0 ${y + 4}Z`} />
            {/* Wheat whisker / awn */}
            <path d={`M-5 ${y - 4}L-11 ${y - 9}M5 ${y - 4}L11 ${y - 9}`} fill="none" stroke="#8c5918" strokeWidth="1" />
          </g>
        ))}
      </g>;
    case 'hills':
      return <g fill="#f4d6b0" stroke="#a85f45" strokeWidth="1.5" strokeLinejoin="round">
        <rect x="-16" y="-15" width="17" height="9" rx="1.5" />
        <rect x="3" y="-15" width="17" height="9" rx="1.5" />
        <rect x="-24" y="-4" width="17" height="9" rx="1.5" />
        <rect x="-5" y="-4" width="17" height="9" rx="1.5" />
        <rect x="14" y="-4" width="13" height="9" rx="1.5" />
        <rect x="-16" y="7" width="17" height="9" rx="1.5" />
        <rect x="3" y="7" width="17" height="9" rx="1.5" />
        <path d="M-13-12H-2M6-12H17M-21-1H-10M-2-1H9M-13 10H-2M6 10H17" stroke="#fff0d4" />
      </g>;
    case 'mountains':
      return <g stroke="#667e80" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M-9-10L-3-20L8-18L15-7L8 1L-3-1Z" fill="#eef0da" />
        <path d="M-23 4L-17-7L-7-7L0 5L-7 13L-18 11Z" fill="#d9dfcf" />
        <path d="M-1 9L6-4L18-2L25 10L17 18L5 17Z" fill="#f2efdc" />
        <path d="M-23 4L-12 6L-7 13M-1 9L12 11L17 18M-9-10L3-7L8 1" fill="none" stroke="#b1bfb5" />
      </g>;
    case 'desert':
      return <g stroke="#817747" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-3 20V-16Q-3-22 3-22Q8-22 8-16V-1H13V-10Q13-14 17-14Q21-14 21-10V3Q21 8 8 8V20Z" fill="#a0a265" />
        <path d="M-3 8H-11Q-16 8-16 2V-6Q-16-10-12-10Q-8-10-8-6V0H-3M2-16V17" fill="none" />
        <path d="M-29 23Q-16 16-7 23M12 24Q22 18 31 22" fill="none" stroke="#b39358" />
      </g>;
  }
}
