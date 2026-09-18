'use client';

import React from 'react';
import { Resource } from '@/lib/catan/types';
import { Landmark, Layers } from 'lucide-react';
import { RESOURCE_NAMES } from '../UI/ResourceIcon';

interface BankDeckBarProps {
  bankResources: Record<Resource, number>;
  devCardsRemaining: number;
  canTrade: boolean;
  onOpenBankTrade: () => void;
}

const RESOURCE_EMOJIS: Record<Resource, string> = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '🪨',
};

export const BankDeckBar: React.FC<BankDeckBarProps> = ({
  bankResources,
  devCardsRemaining,
  canTrade,
  onOpenBankTrade,
}) => {
  return (
    <div className="bank-deck-bar" role="region" aria-label="Bank and development card deck supply">
      <button
        type="button"
        className="bank-deck-trigger"
        onClick={onOpenBankTrade}
        disabled={!canTrade}
        title={canTrade ? 'Trade with Bank / Ports' : 'Bank trade is available during your turn action phase'}
        aria-label="Trade with Bank"
      >
        <Landmark size={18} />
      </button>

      <div className="bank-deck-cards">
        {RESOURCE_NAMES.map((r) => {
          const count = bankResources[r] ?? 0;
          return (
            <div
              key={r}
              className={`bank-card-pile bank-card-${r} ${count === 0 ? 'bank-card-depleted' : ''}`}
              title={`${count} ${r} cards remaining in bank`}
              onClick={canTrade ? onOpenBankTrade : undefined}
            >
              <span className="bank-card-count">{count}</span>
              <span className="bank-card-symbol" aria-hidden="true">
                {RESOURCE_EMOJIS[r]}
              </span>
            </div>
          );
        })}

        <div
          className={`bank-card-pile bank-card-dev ${devCardsRemaining === 0 ? 'bank-card-depleted' : ''}`}
          title={`${devCardsRemaining} development cards remaining in deck`}
        >
          <span className="bank-card-count">{devCardsRemaining}</span>
          <span className="bank-card-symbol" aria-hidden="true">
            <Layers size={11} />
          </span>
        </div>
      </div>
    </div>
  );
};
