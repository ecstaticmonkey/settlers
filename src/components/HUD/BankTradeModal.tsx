'use client';

import React from 'react';
import { Resource, Player } from '@/lib/catan/types';
import { TradeModal } from './TradeModal';

export interface BankTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onExecuteTrade: (give: Resource, get: Resource, count: number) => void;
  canTrade?: boolean;
}

export const BankTradeModal: React.FC<BankTradeModalProps> = ({
  isOpen,
  onClose,
  player,
  onExecuteTrade,
  canTrade = true,
}) => {
  return (
    <TradeModal
      isOpen={isOpen}
      onClose={onClose}
      initialTab="bank"
      currentPlayer={player}
      players={[player]}
      activeOffer={null}
      onCreateOffer={() => {}}
      onRespondOffer={() => {}}
      onConfirmTrade={() => {}}
      onCancelOffer={() => {}}
      onExecuteBankTrade={onExecuteTrade}
      canTrade={canTrade}
    />
  );
};

