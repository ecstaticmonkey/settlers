'use client';

import React from 'react';
import { Port, Vertex } from '@/lib/catan/types';
import { RESOURCE_COLORS } from '@/lib/catan/board';

interface PortMarkerProps {
  port: Port;
  vertices: Vertex[];
}

export const PortMarker: React.FC<PortMarkerProps> = ({ port, vertices }) => {
  const v1 = vertices[port.vertexIds[0]];
  const v2 = vertices[port.vertexIds[1]];

  const getPortEmoji = () => {
    switch (port.resource) {
      case 'wood':
        return '🌲';
      case 'brick':
        return '🧱';
      case 'wheat':
        return '🌾';
      case 'sheep':
        return '🐑';
      case 'ore':
        return '⛰️';
      default:
        return '?';
    }
  };

  const badgeColor = port.resource ? RESOURCE_COLORS[port.resource] : '#3b82f6';

  return (
    <g className="pointer-events-none select-none">
      {/* Wooden pier bridges connecting port to its 2 shoreline vertices */}
      {v1 && (
        <line
          x1={port.pixelX}
          y1={port.pixelY}
          x2={v1.pixelX}
          y2={v1.pixelY}
          stroke="#854d0e"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="4 2"
          opacity="0.85"
        />
      )}
      {v2 && (
        <line
          x1={port.pixelX}
          y1={port.pixelY}
          x2={v2.pixelX}
          y2={v2.pixelY}
          stroke="#854d0e"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="4 2"
          opacity="0.85"
        />
      )}

      {/* Port harbor anchor badge */}
      <circle
        cx={port.pixelX}
        cy={port.pixelY}
        r="17"
        fill={badgeColor}
        stroke="#ffffff"
        strokeWidth="2"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
      />

      {/* Port ratio text / icon */}
      <text
        x={port.pixelX}
        y={port.pixelY - 3}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
      >
        {getPortEmoji()}
      </text>
      <text
        x={port.pixelX}
        y={port.pixelY + 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize="9"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {port.ratio}:1
      </text>
    </g>
  );
};
