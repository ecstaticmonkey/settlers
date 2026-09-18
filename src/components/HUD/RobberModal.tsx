'use client';

import React, { useState } from 'react';
import { Resource, Player } from '@/lib/catan/types';
import { Plus, Minus, Skull, UserCheck } from 'lucide-react';

interface RobberModalProps {
  mode: 'discard' | 'steal' | null;
  player: Player;
  players: Player[];
  eligibleTargetIds: string[];
  onDiscard: (resources: Partial<Record<Resource, number>>) => void;
  onSteal: (targetPlayerId: string) => void;
}

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

export const RobberModal: React.FC<RobberModalProps> = ({
  mode,
  player,
  players,
  eligibleTargetIds,
  onDiscard,
  onSteal,
}) => {
  const [selectedDiscards, setSelectedDiscards] = useState<Partial<Record<Resource, number>>>({});

  if (!mode) return null;

  // 1. Discard Mode
  if (mode === 'discard') {
    const required = player.discardRequired;
    const currentSelected = Object.values(selectedDiscards).reduce((s, n) => s + (n || 0), 0);
    const remainingToSelect = required - currentSelected;

    const updateDiscard = (res: Resource, delta: number) => {
      const cur = selectedDiscards[res] || 0;
      const max = player.resources[res] || 0;
      const next = Math.max(0, Math.min(max, cur + delta));
      setSelectedDiscards((prev) => ({ ...prev, [res]: next }));
    };

    const handleConfirmDiscard = () => {
      if (currentSelected !== required) return;
      onDiscard(selectedDiscards);
      setSelectedDiscards({});
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="relative w-full max-w-md p-6 bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl text-white">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Skull className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-300">Robber Penalty!</h2>
              <p className="text-xs text-slate-400">
                You had more than 7 cards. You must discard half ({required} cards).
              </p>
            </div>
          </div>

          <div className="py-5 flex flex-col gap-4">
            <div className="text-center font-bold text-sm">
              Selected:{' '}
              <span className={remainingToSelect === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {currentSelected} / {required}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {RESOURCES.map((r) => {
                const owned = player.resources[r] || 0;
                const count = selectedDiscards[r] || 0;

                return (
                  <div
                    key={`disc-${r}`}
                    className="flex flex-col items-center p-2 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <span className="text-xs font-semibold capitalize text-slate-300">{r}</span>
                    <span className="text-base font-bold text-red-400 my-1">{count}</span>
                    <span className="text-[10px] text-slate-500 mb-2">Have: {owned}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateDiscard(r, -1)}
                        disabled={count <= 0}
                        className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-white disabled:opacity-30"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => updateDiscard(r, 1)}
                        disabled={count >= owned || remainingToSelect <= 0}
                        className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-white disabled:opacity-30"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleConfirmDiscard}
              disabled={currentSelected !== required}
              className="w-full py-3 rounded-xl font-extrabold bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none text-white shadow-lg transition-all"
            >
              Confirm Discards ({currentSelected}/{required})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Steal Mode
  if (mode === 'steal') {
    const targets = players.filter((p) => eligibleTargetIds.includes(p.id));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="relative w-full max-w-md p-6 bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl text-white">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-purple-300">Robber Steal</h2>
              <p className="text-xs text-slate-400">
                Choose a player adjacent to the robber&apos;s new hex to steal 1 random resource card from.
              </p>
            </div>
          </div>

          <div className="py-5 flex flex-col gap-2.5">
            {targets.map((target) => {
              const totalCards = Object.values(target.resources).reduce((s, n) => s + n, 0);

              return (
                <button
                  key={target.id}
                  onClick={() => onSteal(target.id)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/80 hover:bg-purple-950/20 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm`}
                      style={{ backgroundColor: target.color }}
                    >
                      {target.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-100">{target.name}</div>
                      <div className="text-xs text-slate-400">{totalCards} cards in hand</div>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-3 py-1 rounded-lg bg-purple-600 text-white shadow">
                    Steal
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
