'use client';

import React from 'react';
import { Resource } from '@/lib/catan/types';
import Image from 'next/image';
import { RESOURCE_NAMES } from '../UI/ResourceIcon';

interface ResourceHandProps {
  resources: Record<Resource, number>;
  onOpenBankTrade?: () => void;
  canTrade?: boolean;
  onOpenGuide?: () => void;
}

export function ResourceHand({ resources, onOpenGuide }: ResourceHandProps) {
  const totalCards = Object.values(resources).reduce((a, b) => a + b, 0);

  return (
    <div className="resource-hand-tray" role="region" aria-label="Player resource cards hand">
      <div className="hand-tray-heading"><strong>Your resources</strong><button type="button" onClick={onOpenGuide}>Resource guide</button><span aria-live="polite">{totalCards} cards</span></div>
      <div className="hand-tray-cards">
        {RESOURCE_NAMES.map((r) => {
          const count = resources[r] ?? 0;
          const isEmpty = count === 0;

          return (
            <div
              key={r}
              className={`hand-card hand-card-${r} ${isEmpty ? 'hand-card-empty' : ''}`}
              title={`${r}: ${count} in hand`}
            >
              <div className="hand-card-art-wrap">
                <Image
                  className="hand-card-art"
                  src={`/images/resources/${r}.webp`}
                  alt={`CATAN ${r} card`}
                  width={140}
                  height={210}
                  unoptimized
                />
              </div>
              <span className="hand-card-label">{r}</span>
              <strong className="hand-card-count" aria-label={`${count} ${r}`}>
                {count}
              </strong>
            </div>
          );
        })}
      </div>

    </div>
  );
}
