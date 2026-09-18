'use client';

import React, { useState } from 'react';
import { DevCardType, Resource, Player } from '@/lib/catan/types';
import { DEV_CARD_NAMES } from '@/lib/catan/engine';
import { X, Shield, Route, Gift, Coins, Crown } from 'lucide-react';

interface DevCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  canPlay?: boolean;
  player: Player;
  onPlayCard: (
    card: DevCardType,
    params?: { targetResource?: Resource; targetResource2?: Resource; monopolyResource?: Resource }
  ) => void;
}

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

const CARD_ICONS: Record<DevCardType, React.ReactNode> = {
  knight: <Shield className="w-6 h-6 text-blue-400" />,
  road_building: <Route className="w-6 h-6 text-cyan-400" />,
  year_of_plenty: <Gift className="w-6 h-6 text-emerald-400" />,
  monopoly: <Coins className="w-6 h-6 text-amber-400" />,
  victory_point: <Crown className="w-6 h-6 text-yellow-400" />,
};

const CARD_DESCRIPTIONS: Record<DevCardType, string> = {
  knight: 'Move the robber to a new hex and steal 1 resource from an adjacent player.',
  road_building: 'Place 2 roads immediately at no resource cost.',
  year_of_plenty: 'Take any 2 resources from the bank of your choice.',
  monopoly: 'Choose 1 resource type. All other players must give you all their cards of that type.',
  victory_point: 'Gives 1 secret Victory Point towards your 10 VP goal.',
};

export const DevCardModal: React.FC<DevCardModalProps> = ({
  isOpen,
  onClose,
  canPlay = true,
  player,
  onPlayCard,
}) => {
  const [selectedCard, setSelectedCard] = useState<DevCardType | null>(null);
  const [yop1, setYop1] = useState<Resource>('wheat');
  const [yop2, setYop2] = useState<Resource>('ore');
  const [monoRes, setMonoRes] = useState<Resource>('ore');

  if (!isOpen) return null;

  const handlePlay = (card: DevCardType) => {
    if (!canPlay) return;
    if (card === 'year_of_plenty') {
      onPlayCard('year_of_plenty', { targetResource: yop1, targetResource2: yop2 });
    } else if (card === 'monopoly') {
      onPlayCard('monopoly', { monopolyResource: monoRes });
    } else {
      onPlayCard(card);
    }
    onClose();
  };

  const cardTypes: DevCardType[] = ['knight', 'road_building', 'year_of_plenty', 'monopoly', 'victory_point'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg p-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-lg font-bold">Development Cards</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cards Grid */}
        <div className="py-5 flex flex-col gap-3">
          {cardTypes.map((type) => {
            const count = player.devCards[type] || 0;
            const isVP = type === 'victory_point';
            const isPlayable = canPlay && count > 0 && !isVP;

            return (
              <div
                key={type}
                className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
                  count > 0
                    ? 'border-purple-600/60 bg-purple-950/20'
                    : 'border-slate-800 bg-slate-950/40 opacity-40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                      {CARD_ICONS[type]}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        {DEV_CARD_NAMES[type]}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                          x{count}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{CARD_DESCRIPTIONS[type]}</p>
                    </div>
                  </div>

                  {isPlayable && (
                    <button
                      onClick={() => (type === 'year_of_plenty' || type === 'monopoly' ? setSelectedCard(type) : handlePlay(type))}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-colors"
                    >
                      Play
                    </button>
                  )}
                </div>

                {/* Sub-parameters for Year of Plenty */}
                {selectedCard === 'year_of_plenty' && type === 'year_of_plenty' && (
                  <div className="mt-2 pt-2 border-t border-purple-800/40 flex flex-col gap-2">
                    <span className="text-xs text-purple-300 font-semibold">Choose 2 resources:</span>
                    <div className="flex gap-2">
                      <select
                        value={yop1}
                        onChange={(e) => setYop1(e.target.value as Resource)}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-xs p-1.5 capitalize text-white"
                      >
                        {RESOURCES.map((r) => (
                          <option key={`y1-${r}`} value={r}>{r}</option>
                        ))}
                      </select>
                      <select
                        value={yop2}
                        onChange={(e) => setYop2(e.target.value as Resource)}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-xs p-1.5 capitalize text-white"
                      >
                        {RESOURCES.map((r) => (
                          <option key={`y2-${r}`} value={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handlePlay('year_of_plenty')}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white ml-auto"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-parameters for Monopoly */}
                {selectedCard === 'monopoly' && type === 'monopoly' && (
                  <div className="mt-2 pt-2 border-t border-purple-800/40 flex flex-col gap-2">
                    <span className="text-xs text-purple-300 font-semibold">Choose resource to monopolize:</span>
                    <div className="flex gap-2">
                      <select
                        value={monoRes}
                        onChange={(e) => setMonoRes(e.target.value as Resource)}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-xs p-1.5 capitalize text-white flex-1"
                      >
                        {RESOURCES.map((r) => (
                          <option key={`m-${r}`} value={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handlePlay('monopoly')}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold"
                      >
                        Monopolize
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
