'use client';

import React, { useState } from 'react';
import { Resource, Player } from '@/lib/catan/types';
import { X, ArrowRight, Anchor } from 'lucide-react';

interface BankTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onExecuteTrade: (give: Resource, get: Resource, count: number) => void;
}

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

export const BankTradeModal: React.FC<BankTradeModalProps> = ({
  isOpen,
  onClose,
  player,
  onExecuteTrade,
}) => {
  const [giveRes, setGiveRes] = useState<Resource>('wood');
  const [getRes, setGetRes] = useState<Resource>('brick');

  if (!isOpen) return null;

  // Calculate ratio for selected give resource based on player's owned ports
  const getRatioForResource = (res: Resource): number => {
    if (player.portsOwned.includes(`${res}_2_1`)) return 2;
    if (player.portsOwned.includes('generic_3_1')) return 3;
    return 4;
  };

  const ratio = getRatioForResource(giveRes);
  const playerHasAmount = player.resources[giveRes] || 0;
  const canAfford = playerHasAmount >= ratio && giveRes !== getRes;

  const handleTrade = () => {
    if (!canAfford) return;
    onExecuteTrade(giveRes, getRes, 1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Maritime / Bank Trade</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 flex flex-col gap-5">
          {/* Ratio summary notification */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            Current Rate for <span className="capitalize font-bold text-amber-300">{giveRes}</span>:{' '}
            <span className="font-extrabold text-white">{ratio}:1</span>{' '}
            {ratio === 2 ? '(Special 2:1 Harbor)' : ratio === 3 ? '(3:1 Harbor)' : '(Standard 4:1)'}
          </div>

          {/* Selector 1: Give */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Give {ratio} Cards of:
            </label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {RESOURCES.map((r) => {
                const rRatio = getRatioForResource(r);
                const has = player.resources[r] || 0;
                const isSelected = giveRes === r;

                return (
                  <button
                    key={`give-${r}`}
                    onClick={() => setGiveRes(r)}
                    className={`flex flex-col items-center p-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 text-white ring-1 ring-amber-400'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>{r}</span>
                    <span className="text-[10px] text-slate-400 mt-1">({rRatio}:1)</span>
                    <span className="text-[10px] text-amber-400 font-bold mt-0.5">{has} in hand</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </div>

          {/* Selector 2: Receive */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Receive 1 Card of:
            </label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {RESOURCES.map((r) => {
                const isSelected = getRes === r;
                const isDisabled = giveRes === r;

                return (
                  <button
                    key={`get-${r}`}
                    disabled={isDisabled}
                    onClick={() => setGetRes(r)}
                    className={`flex flex-col items-center p-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                      isDisabled
                        ? 'opacity-30 pointer-events-none border-slate-900 bg-slate-950'
                        : isSelected
                        ? 'border-emerald-400 bg-emerald-500/20 text-white ring-1 ring-emerald-400'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>{r}</span>
                    <span className="text-[10px] text-emerald-400 mt-1">+1</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trade Button */}
          <button
            onClick={handleTrade}
            disabled={!canAfford}
            className="w-full py-3 mt-2 rounded-xl font-extrabold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 shadow-lg transition-all"
          >
            {canAfford
              ? `Exchange ${ratio} ${giveRes} for 1 ${getRes}`
              : `Need ${ratio} ${giveRes} (You have ${playerHasAmount})`}
          </button>
        </div>
      </div>
    </div>
  );
};
