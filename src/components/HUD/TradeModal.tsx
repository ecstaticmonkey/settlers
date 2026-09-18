'use client';

import React, { useState } from 'react';
import { Resource, TradeOffer, Player } from '@/lib/catan/types';
import { Plus, Minus, ArrowRight, X, Check, ArrowLeftRight } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  canOffer?: boolean;
  currentPlayer: Player;
  players: Player[];
  activeOffer: TradeOffer | null;
  onCreateOffer: (give: Partial<Record<Resource, number>>, want: Partial<Record<Resource, number>>) => void;
  onRespondOffer: (accept: boolean) => void;
  onConfirmTrade: (targetPlayerId: string) => void;
  onCancelOffer: () => void;
}

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  canOffer = true,
  currentPlayer,
  players,
  activeOffer,
  onCreateOffer,
  onRespondOffer,
  onConfirmTrade,
  onCancelOffer,
}) => {
  const [give, setGive] = useState<Partial<Record<Resource, number>>>({});
  const [want, setWant] = useState<Partial<Record<Resource, number>>>({});

  if (!isOpen) return null;

  const isMyOffer = activeOffer?.fromPlayerId === currentPlayer.id;
  const offeringPlayer = players.find((p) => p.id === activeOffer?.fromPlayerId);

  const updateGive = (res: Resource, delta: number) => {
    const current = give[res] || 0;
    const max = currentPlayer.resources[res] || 0;
    const next = Math.max(0, Math.min(max, current + delta));
    setGive((prev) => ({ ...prev, [res]: next }));
  };

  const updateWant = (res: Resource, delta: number) => {
    const current = want[res] || 0;
    const next = Math.max(0, current + delta);
    setWant((prev) => ({ ...prev, [res]: next }));
  };

  const handleSendOffer = () => {
    const totalGive = Object.values(give).reduce((s, n) => s + (n || 0), 0);
    const totalWant = Object.values(want).reduce((s, n) => s + (n || 0), 0);
    if (totalGive === 0 || totalWant === 0) return;

    onCreateOffer(give, want);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg p-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Player Trading</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Active Offer from another player */}
        {activeOffer && !isMyOffer && (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="text-sm text-slate-300">
              <span className="font-bold text-amber-400">{offeringPlayer?.name}</span> is offering:
            </div>

            <div className="flex items-center justify-center gap-6 w-full p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              {/* They give */}
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase text-slate-400 font-bold mb-1">They Give</span>
                <div className="flex gap-1.5">
                  {Object.entries(activeOffer.give).map(([r, count]) =>
                    count ? (
                      <span key={r} className="px-2 py-1 rounded bg-slate-800 text-xs font-bold capitalize">
                        {count} {r}
                      </span>
                    ) : null
                  )}
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-500" />

              {/* They want */}
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase text-slate-400 font-bold mb-1">They Want</span>
                <div className="flex gap-1.5">
                  {Object.entries(activeOffer.want).map(([r, count]) =>
                    count ? (
                      <span key={r} className="px-2 py-1 rounded bg-slate-800 text-xs font-bold capitalize text-amber-300">
                        {count} {r}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            </div>

            {/* Accept / Decline buttons */}
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => {
                  onRespondOffer(true);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-colors"
              >
                <Check className="w-4 h-4" /> Accept Trade
              </button>
              <button
                onClick={() => {
                  onRespondOffer(false);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-colors"
              >
                <X className="w-4 h-4" /> Decline
              </button>
            </div>
          </div>
        )}

        {/* Current Player's Active Offer (Waiting for responses) */}
        {activeOffer && isMyOffer && (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="text-sm text-slate-300">Your trade offer is open to other players:</div>

            {/* Responses from players */}
            <div className="w-full flex flex-col gap-2">
              {players
                .filter((p) => p.id !== currentPlayer.id)
                .map((p) => {
                  const response = activeOffer.responses[p.id];
                  const hasAccepted = response === 'accept';

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{p.name}</span>
                        {response ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              hasAccepted
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {hasAccepted ? 'Accepted' : 'Declined'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">Deciding...</span>
                        )}
                      </div>

                      {hasAccepted && (
                        <button
                          onClick={() => {
                            onConfirmTrade(p.id);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                        >
                          Trade with {p.name}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <button
              onClick={() => {
                onCancelOffer();
                onClose();
              }}
              className="mt-2 text-xs text-rose-400 hover:text-rose-300 underline"
            >
              Cancel Offer
            </button>
          </div>
        )}

        {/* Create new offer UI */}
        {!activeOffer && (
          <div className="py-4 flex flex-col gap-6">
            {/* Section 1: I Give */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                I Give (Your Hand)
              </span>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {RESOURCES.map((res) => {
                  const owned = currentPlayer.resources[res] || 0;
                  const amt = give[res] || 0;

                  return (
                    <div
                      key={`give-${res}`}
                      className="flex flex-col items-center p-2 rounded-xl bg-slate-950 border border-slate-800"
                    >
                      <span className="text-xs font-semibold capitalize text-slate-300">{res}</span>
                      <span className="text-lg font-black text-amber-400 my-1">{amt}</span>
                      <span className="text-[10px] text-slate-500 mb-2">Have: {owned}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateGive(res, -1)}
                          disabled={amt <= 0}
                          className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-white disabled:opacity-30"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => updateGive(res, 1)}
                          disabled={amt >= owned}
                          className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-white disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: I Want */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                I Want
              </span>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {RESOURCES.map((res) => {
                  const amt = want[res] || 0;

                  return (
                    <div
                      key={`want-${res}`}
                      className="flex flex-col items-center p-2 rounded-xl bg-slate-950 border border-slate-800"
                    >
                      <span className="text-xs font-semibold capitalize text-slate-300">{res}</span>
                      <span className="text-lg font-black text-emerald-400 my-1">{amt}</span>
                      <div className="flex items-center gap-1 mt-4">
                        <button
                          onClick={() => updateWant(res, -1)}
                          disabled={amt <= 0}
                          className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-white disabled:opacity-30"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => updateWant(res, 1)}
                          className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Offer Button */}
            <button
              onClick={handleSendOffer}
              className="w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
            >
              Broadcast Offer to Players
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
