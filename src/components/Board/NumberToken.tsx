'use client';

import React from 'react';
import { NUMBER_PIPS } from '@/lib/catan/board';

interface NumberTokenProps {
  number: number;
  pixelX: number;
  pixelY: number;
  blockedByRobber?: boolean;
}

export const NumberToken: React.FC<NumberTokenProps> = ({ number, pixelX, pixelY, blockedByRobber }) => {
  const hot = number === 6 || number === 8;
  const pips = NUMBER_PIPS[number] || 0;
  return <g className="flat-number" transform={`translate(${pixelX}, ${pixelY + 18})`} opacity={blockedByRobber ? .5 : 1} pointerEvents="none">
    <rect x="-18" y="-17" width="36" height="39" rx="5" fill="#162c30" opacity=".17" />
    <rect x="-18" y="-19" width="36" height="39" rx="5" fill="var(--flat-ivory)" stroke="#c6b88e" strokeWidth=".8" />
    <path d="M-13-17H13" stroke="#fffdf3" strokeWidth="1.5" strokeLinecap="round" />
    <text y="2" textAnchor="middle" fill={hot ? 'var(--flat-hot)' : 'var(--flat-token-ink)'} fontSize="25" fontWeight="850" letterSpacing="-1.3">{number}</text>
    {Array.from({ length: pips }, (_, i) => <circle key={i} cx={(i - (pips - 1) / 2) * 4.2} cy="11.5" r="1.35" fill={hot ? 'var(--flat-hot)' : 'var(--flat-token-ink)'} />)}
  </g>;
};

export const RobberPawn: React.FC<{ pixelX: number; pixelY: number }> = ({ pixelX, pixelY }) => (
  <g className="flat-robber" transform={`translate(${pixelX + 25}, ${pixelY - 8})`} pointerEvents="none">
    <title>Robber — production blocked</title>
    <ellipse cy="19" rx="12" ry="5" fill="#102b36" opacity=".25" />
    <path d="M-9 13Q-8 1-5-5H5Q8 1 9 13L11 17Q0 23-11 17Z" fill="#536877" stroke="#253e4d" strokeWidth="1.8" />
    <ellipse cy="-10" rx="7.5" ry="8" fill="#758794" stroke="#253e4d" strokeWidth="1.8" />
    <path d="M-4-13Q-1-17 3-14M-4 2L-6 12" fill="none" stroke="#c5d0d3" strokeWidth="2" strokeLinecap="round" opacity=".65" />
    <path d="M-9 15Q0 20 9 15" fill="none" stroke="#9aaab0" strokeWidth="1.4" />
  </g>
);
