'use client';

import React from 'react';
import { NUMBER_PIPS } from '@/lib/catan/board';

interface NumberTokenProps {
  number: number;
  pixelX: number;
  pixelY: number;
  blockedByRobber?: boolean;
}

export const NumberToken: React.FC<NumberTokenProps> = ({
  number,
  pixelX,
  pixelY,
  blockedByRobber,
}) => {
  const isHighProbability = number === 6 || number === 8;
  const pips = NUMBER_PIPS[number] || 0;

  // Render pip dots under number
  const renderPips = () => {
    const dots = [];
    const dotSpacing = 5;
    const startX = pixelX - ((pips - 1) * dotSpacing) / 2;
    const dotY = pixelY + 10;

    for (let i = 0; i < pips; i++) {
      dots.push(
        <circle
          key={i}
          cx={startX + i * dotSpacing}
          cy={dotY}
          r={isHighProbability ? 1.8 : 1.4}
          fill={isHighProbability ? '#dc2626' : '#334155'}
        />
      );
    }
    return dots;
  };

  return (
    <g className="pointer-events-none select-none transition-opacity duration-300">
      {/* Outer Token Circle */}
      <circle
        cx={pixelX}
        cy={pixelY}
        r="18"
        fill="#fdfbf7"
        stroke={isHighProbability ? '#ef4444' : '#94a3b8'}
        strokeWidth={isHighProbability ? 2 : 1.5}
        filter="drop-shadow(0 2px 3px rgba(0,0,0,0.25))"
        opacity={blockedByRobber ? 0.45 : 1}
      />

      {/* Number Value */}
      <text
        x={pixelX}
        y={pixelY + 3}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={isHighProbability ? '#dc2626' : '#1e293b'}
        fontSize={isHighProbability ? '16' : '15'}
        fontWeight="800"
        fontFamily="sans-serif"
        opacity={blockedByRobber ? 0.45 : 1}
      >
        {number}
      </text>

      {/* Probability Pip Dots */}
      <g opacity={blockedByRobber ? 0.35 : 1}>{renderPips()}</g>
    </g>
  );
};

export const RobberPawn: React.FC<{ pixelX: number; pixelY: number }> = ({
  pixelX,
  pixelY,
}) => {
  return (
    <g className="pointer-events-none select-none drop-shadow-md animate-bounce" style={{ animationDuration: '2.5s' }}>
      {/* Pawn base */}
      <ellipse cx={pixelX} cy={pixelY + 12} rx="12" ry="5" fill="#18181b" />
      {/* Pawn body */}
      <path
        d={`M ${pixelX - 8} ${pixelY + 10} C ${pixelX - 5} ${pixelY} ${pixelX - 4} ${pixelY - 6} ${pixelX - 6} ${pixelY - 10} C ${pixelX - 6} ${pixelY - 14} ${pixelX + 6} ${pixelY - 14} ${pixelX + 6} ${pixelY - 10} C ${pixelX + 4} ${pixelY - 6} ${pixelX + 5} ${pixelY} ${pixelX + 8} ${pixelY + 10} Z`}
        fill="#27272a"
        stroke="#09090b"
        strokeWidth="1.2"
      />
      {/* Pawn head */}
      <circle cx={pixelX} cy={pixelY - 12} r="6.5" fill="#18181b" stroke="#09090b" strokeWidth="1.2" />
    </g>
  );
};
