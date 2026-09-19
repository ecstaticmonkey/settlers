'use client';

import React from 'react';
import { Resource } from '@/lib/catan/types';
import { GameArtwork, ResourceCardArt } from '../UI/GameArtwork';
import { RESOURCE_NAMES } from '../UI/ResourceIcon';

interface BankDeckBarProps {
  bankResources: Record<Resource, number>;
  devCardsRemaining: number;
  canTrade: boolean;
  onOpenBankTrade: () => void;
}



export const BankDeckBar: React.FC<BankDeckBarProps> = ({
  bankResources,
  devCardsRemaining,
  onOpenBankTrade,
}) => {
  return (
    <div className="bank-deck-bar" role="region" aria-label="Bank and development card deck supply">
      <button
        type="button"
        className="bank-deck-trigger"
        onClick={onOpenBankTrade}
        title="View Bank & Port Trade Rates"
        aria-label="Trade with Bank"
      >
        <GameArtwork kind="bank" />
        <span className="sr-only">Bank</span>
      </button>

      <div className="bank-deck-cards">
        {RESOURCE_NAMES.map((r) => {
          const count = bankResources[r] ?? 0;
          return (
            <button
              type="button"
              key={r}
              className={`bank-card-pile bank-card-${r} ${count === 0 ? 'bank-card-depleted' : ''}`}
              title={`${count} ${r} cards remaining in bank`}
              aria-label={`${count} ${r} in bank. Trade with bank`}
              onClick={onOpenBankTrade}
            >
              <span className="bank-card-count">{count}</span>
              <span className="bank-card-symbol" aria-hidden="true">
                <ResourceCardArt resource={r} />
              </span>
              <span className="bank-card-label sr-only">{r}</span>
            </button>
          );
        })}

        <div
          className={`bank-card-pile bank-card-dev ${devCardsRemaining === 0 ? 'bank-card-depleted' : ''}`}
          title={`${devCardsRemaining} development cards remaining in deck`}
          aria-label={`${devCardsRemaining} development cards remaining in deck`}
        >
          <span className="bank-card-count">{devCardsRemaining}</span>
          <span className="bank-card-symbol" aria-hidden="true">
            <GameArtwork kind="development" />
          </span>
          <span className="bank-card-label">Dev</span>
        </div>
      </div>
    </div>
  );
};
