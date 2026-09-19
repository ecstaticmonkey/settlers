'use client';

import React from 'react';
import { HexTerrain, Port, Resource, Vertex } from '@/lib/catan/types';
import { TerrainIllustration } from './FlatBoardArt';

const PORT_TERRAIN: Record<Resource, HexTerrain> = {
  wood: 'forest', sheep: 'pasture', wheat: 'fields', brick: 'hills', ore: 'mountains',
};

export const PortMarker: React.FC<{ port: Port; vertices: Vertex[] }> = ({ port, vertices }) => {
  const ends = port.vertexIds.map(id => vertices[id]).filter(Boolean);
  if (ends.length !== 2) return null;
  const midX = (ends[0].pixelX + ends[1].pixelX) / 2;
  const midY = (ends[0].pixelY + ends[1].pixelY) / 2;
  const dx = port.pixelX - midX;
  const dy = port.pixelY - midY;
  const distance = Math.hypot(dx, dy) || 1;
  // Move artwork only; the game's port/vertex assignments remain authoritative.
  const x = port.pixelX + dx / distance * 23;
  const y = port.pixelY + dy / distance * 23;

  return <g className="flat-port" pointerEvents="none">
    <title>{port.resource ? `${port.ratio}:1 ${port.resource} harbor` : '3:1 general harbor'}</title>
    {ends.map(vertex => {
      const endX = vertex.pixelX + (x - vertex.pixelX) * .53;
      const endY = vertex.pixelY + (y - vertex.pixelY) * .53;
      return <g key={vertex.id}>
        <path d={`M${vertex.pixelX} ${vertex.pixelY}L${endX} ${endY}`} stroke="#8b623a" strokeWidth="8" />
        <path d={`M${vertex.pixelX} ${vertex.pixelY}L${endX} ${endY}`} stroke="#dfb66b" strokeWidth="7" strokeDasharray="2.5 1.5" />
      </g>;
    })}
    <g transform={`translate(${x}, ${y})`}>
      <path d="M-18 22Q0 28 19 21M-12 27Q0 31 12 27" fill="none" stroke="#97d7df" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      <path d="M-18 13Q0 19 19 11L14 21Q-2 28-14 21Z" fill="#bf8950" stroke="#795936" strokeWidth="1.3" />
      <path d="M-17 13Q0 19 18 12" fill="none" stroke="#f0d097" strokeWidth="3" />
      <path d="M0-29V14" stroke="#dabf87" strokeWidth="2.5" />
      <path d="M1-28L16-27L11-22H1Z" fill="var(--flat-ivory)" />
      <path d="M-14-19Q-23-3-13 12Q1 16 15 9Q10-3 13-19Z" fill="var(--flat-ivory)" stroke="#bdc4b8" strokeWidth="1.2" />
      <path d="M-12-16Q-17-5-12 8" fill="none" stroke="#ffffff" strokeWidth="2" />
      {port.resource ? <g transform="translate(0,-8) scale(.31)"><TerrainIllustration terrain={PORT_TERRAIN[port.resource]} /></g>
        : <text y="-3" textAnchor="middle" fill="#65594d" fontSize="17" fontWeight="800">?</text>}
      <text y="9" textAnchor="middle" fill="#4f5853" fontSize="10" fontWeight="750">{port.ratio}:1</text>
    </g>
  </g>;
};
