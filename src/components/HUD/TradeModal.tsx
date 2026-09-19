'use client';

import React, { useState, useEffect } from 'react';
import { Resource, TradeOffer, Player, PortType } from '@/lib/catan/types';
import {
  Plus,
  Minus,
  ArrowRight,
  ArrowDown,
  X,
  Check,
  ArrowLeftRight,
  RotateCcw,
  Landmark,
  Users,
  Anchor,
  AlertCircle,
} from 'lucide-react';
import { RESOURCE_TOKENS, PLAYER_TOKENS } from '@/lib/catan/tokens';

export interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'player' | 'bank';
  canOffer?: boolean;
  canTrade?: boolean;
  currentPlayer: Player;
  players: Player[];
  activeOffer: TradeOffer | null;
  onCreateOffer: (give: Partial<Record<Resource, number>>, want: Partial<Record<Resource, number>>) => void;
  onRespondOffer: (accept: boolean) => void;
  onConfirmTrade: (targetPlayerId: string) => void;
  onCancelOffer: () => void;
  onExecuteBankTrade?: (give: Resource, get: Resource, count: number) => void;
}

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'player',
  canOffer = true,
  canTrade = true,
  currentPlayer,
  players,
  activeOffer,
  onCreateOffer,
  onRespondOffer,
  onConfirmTrade,
  onCancelOffer,
  onExecuteBankTrade,
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'bank'>(initialTab);
  const [give, setGive] = useState<Partial<Record<Resource, number>>>({});
  const [want, setWant] = useState<Partial<Record<Resource, number>>>({});

  // Bank trade state
  const [bankGiveRes, setBankGiveRes] = useState<Resource>('wood');
  const [bankGetRes, setBankGetRes] = useState<Resource>('brick');
  const [bankTradeUnits, setBankTradeUnits] = useState<number>(1);

  // Sync tab when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // If there is an active offer not created by me, ensure player sees the offer tab
  useEffect(() => {
    if (isOpen && activeOffer && activeOffer.fromPlayerId !== currentPlayer.id) {
      setActiveTab('player');
    }
  }, [isOpen, activeOffer, currentPlayer.id]);

  if (!isOpen) return null;

  const isMyOffer = activeOffer?.fromPlayerId === currentPlayer.id;
  const offeringPlayer = players.find((p) => p.id === activeOffer?.fromPlayerId);

  // Port ratio helper
  const getRatioForResource = (res: Resource): number => {
    const specificPort: PortType = `${res}_2_1`;
    if (currentPlayer.portsOwned.includes(specificPort)) return 2;
    if (currentPlayer.portsOwned.includes('generic_3_1')) return 3;
    return 4;
  };

  const currentBankRatio = getRatioForResource(bankGiveRes);
  const playerGiveCount = currentPlayer.resources[bankGiveRes] || 0;
  const maxPossibleBankUnits = Math.max(1, Math.floor(playerGiveCount / currentBankRatio));
  const bankCanAfford =
    playerGiveCount >= currentBankRatio * bankTradeUnits && bankGiveRes !== bankGetRes;

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

  const handleClear = () => {
    setGive({});
    setWant({});
  };

  const handleSendOffer = () => {
    if (!canOffer) return;
    const totalGive = Object.values(give).reduce((s, n) => s + (n || 0), 0);
    const totalWant = Object.values(want).reduce((s, n) => s + (n || 0), 0);
    if (totalGive === 0 || totalWant === 0) return;

    onCreateOffer(give, want);
  };

  const handleExecuteBankTrade = () => {
    if (!bankCanAfford || !onExecuteBankTrade) return;
    onExecuteBankTrade(bankGiveRes, bankGetRes, bankTradeUnits);
    onClose();
  };

  const handleCounterOffer = () => {
    if (!activeOffer) return;
    // Reverse what they wanted into what we give, and what they gave into what we want
    setGive({ ...activeOffer.want });
    setWant({ ...activeOffer.give });
    onRespondOffer(false); // decline original offer so we can propose counter
  };

  // Check if current player can afford incoming offer
  const canAffordIncomingOffer = (): { affordable: boolean; missing: Resource[] } => {
    if (!activeOffer) return { affordable: true, missing: [] };
    const missing: Resource[] = [];
    for (const [r, count] of Object.entries(activeOffer.want) as [Resource, number][]) {
      if (count && (currentPlayer.resources[r] || 0) < count) {
        missing.push(r);
      }
    }
    return { affordable: missing.length === 0, missing };
  };

  const incomingAffordability = canAffordIncomingOffer();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-white flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header with Colonist.io style Navigation Tabs */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('player')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'player'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Player Trade</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'bank'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Bank Trade</span>
            </button>
          </div>

          <button
            onClick={onClose}
            aria-label="Close trade dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* ========================================================= */}
          {/* TAB 1: PLAYER TRADE                                       */}
          {/* ========================================================= */}
          {activeTab === 'player' && (
            <>
              {/* Scenario 1: Active offer from another player */}
              {activeOffer && !isMyOffer && (
                <div className="py-2 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span
                      className="w-3 h-3 rounded-full inline-block ring-2 ring-white/20"
                      style={{
                        backgroundColor:
                          PLAYER_TOKENS[offeringPlayer?.color || 'red']?.fill || '#ef4444',
                      }}
                    />
                    <span className="font-bold text-amber-400">{offeringPlayer?.name}</span>
                    <span>proposes a trade:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-950/70 rounded-xl border border-slate-800">
                    {/* They Give */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5" /> You Receive (They Give)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(activeOffer.give).map(([r, count]) => {
                          if (!count) return null;
                          const token = RESOURCE_TOKENS[r as Resource];
                          return (
                            <span
                              key={r}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
                              style={{
                                backgroundColor: `${token.color}25`,
                                borderColor: `${token.color}60`,
                                color: token.color,
                              }}
                            >
                              <span>{token.emoji}</span>
                              <span>
                                {count} {token.label}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* They Want */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 rotate-180 md:rotate-0" /> You Give (They Want)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(activeOffer.want).map(([r, count]) => {
                          if (!count) return null;
                          const token = RESOURCE_TOKENS[r as Resource];
                          const haveCount = currentPlayer.resources[r as Resource] || 0;
                          const hasEnough = haveCount >= count;

                          return (
                            <span
                              key={r}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                                hasEnough ? '' : 'ring-1 ring-rose-500'
                              }`}
                              style={{
                                backgroundColor: `${token.color}25`,
                                borderColor: `${token.color}60`,
                                color: token.color,
                              }}
                            >
                              <span>{token.emoji}</span>
                              <span>
                                {count} {token.label}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                (Have {haveCount})
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Warning if player cannot afford */}
                  {!incomingAffordability.affordable && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        You cannot afford this trade. Missing:{' '}
                        {incomingAffordability.missing.join(', ')}.
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        onRespondOffer(true);
                        onClose();
                      }}
                      disabled={!incomingAffordability.affordable}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white shadow-lg transition-colors"
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
                    <button
                      onClick={handleCounterOffer}
                      className="px-4 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
                      title="Adjust resources and propose counter-offer"
                    >
                      Counter
                    </button>
                  </div>
                </div>
              )}

              {/* Scenario 2: Current player has an active trade offer open */}
              {activeOffer && isMyOffer && (
                <div className="py-2 flex flex-col gap-4">
                  {/* Summary of open offer */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-slate-400 font-semibold mb-1">Your Broadcast Offer:</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-amber-400 font-bold">You Give:</span>
                        {Object.entries(activeOffer.give).map(([r, count]) =>
                          count ? (
                            <span key={r} className="px-2 py-0.5 rounded bg-slate-800 text-xs capitalize">
                              {count} {r}
                            </span>
                          ) : null
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-emerald-400 font-bold">You Want:</span>
                        {Object.entries(activeOffer.want).map(([r, count]) =>
                          count ? (
                            <span key={r} className="px-2 py-0.5 rounded bg-slate-800 text-xs capitalize">
                              {count} {r}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Colonist.io live response strip */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Settlers Response
                    </span>

                    <div className="flex flex-col gap-2">
                      {players
                        .filter((p) => p.id !== currentPlayer.id)
                        .map((p) => {
                          const response = activeOffer.responses[p.id];
                          const hasAccepted = response === 'accept';
                          const playerToken = PLAYER_TOKENS[p.color || 'red'];

                          return (
                            <div
                              key={p.id}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                hasAccepted
                                  ? 'bg-emerald-950/30 border-emerald-500/50'
                                  : 'bg-slate-950/50 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20"
                                  style={{ backgroundColor: playerToken?.fill || '#cbd5e1' }}
                                />
                                <span className="font-semibold text-sm">{p.name}</span>
                                {response ? (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                                      hasAccepted
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                    }`}
                                  >
                                    {hasAccepted ? (
                                      <>
                                        <Check className="w-3 h-3" /> Accepted
                                      </>
                                    ) : (
                                      <>
                                        <X className="w-3 h-3" /> Declined
                                      </>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-500 font-medium animate-pulse">
                                    Thinking...
                                  </span>
                                )}
                              </div>

                              {hasAccepted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onConfirmTrade(p.id);
                                    onClose();
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all transform hover:scale-105"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Trade with {p.name}</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onCancelOffer();
                      onClose();
                    }}
                    className="mt-1 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                  >
                    Cancel Trade Offer
                  </button>
                </div>
              )}

              {/* Scenario 3: Create a new trade offer */}
              {!activeOffer && (
                <div className="space-y-4">
                  {/* Section: I Give */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>I Give</span>
                        <span className="text-slate-500 font-normal normal-case">(from hand)</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {RESOURCES.map((res) => {
                        const owned = currentPlayer.resources[res] || 0;
                        const amt = give[res] || 0;
                        const token = RESOURCE_TOKENS[res];
                        const isZeroOwned = owned === 0;

                        return (
                          <div
                            key={`give-${res}`}
                            className={`flex flex-col items-center p-2 rounded-xl bg-slate-950 border transition-all ${
                              isZeroOwned ? 'opacity-40' : ''
                            }`}
                            style={{
                              borderColor: amt > 0 ? token.color : '#1e293b',
                              backgroundColor: amt > 0 ? `${token.color}15` : undefined,
                            }}
                          >
                            <span
                              className="text-[11px] font-bold capitalize px-1.5 py-0.5 rounded-md flex items-center gap-1 w-full justify-center"
                              style={{
                                backgroundColor: `${token.color}28`,
                                color: token.color,
                                border: `1px solid ${token.color}55`,
                              }}
                            >
                              <span aria-hidden="true">{token.emoji}</span>
                              <span className="truncate">{res}</span>
                            </span>

                            <span className="text-xl font-black text-amber-400 my-1">{amt}</span>
                            <span className="text-[10px] text-slate-400 mb-2">Have: {owned}</span>

                            <div className="flex items-center gap-1 w-full justify-center">
                              <button
                                type="button"
                                onClick={() => updateGive(res, -1)}
                                aria-label={`Decrease ${res} to give`}
                                disabled={amt <= 0}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateGive(res, 1)}
                                aria-label={`Increase ${res} to give`}
                                disabled={amt >= owned}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center justify-center gap-2 text-slate-500 py-1">
                    <div className="h-px bg-slate-800 flex-1" />
                    <ArrowDown className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">FOR</span>
                    <ArrowDown className="w-4 h-4 text-slate-400" />
                    <div className="h-px bg-slate-800 flex-1" />
                  </div>

                  {/* Section: I Want */}
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                      I Want (You Receive)
                    </span>

                    <div className="grid grid-cols-5 gap-2">
                      {RESOURCES.map((res) => {
                        const amt = want[res] || 0;
                        const token = RESOURCE_TOKENS[res];

                        return (
                          <div
                            key={`want-${res}`}
                            className="flex flex-col items-center p-2 rounded-xl bg-slate-950 border transition-all"
                            style={{
                              borderColor: amt > 0 ? token.color : '#1e293b',
                              backgroundColor: amt > 0 ? `${token.color}15` : undefined,
                            }}
                          >
                            <span
                              className="text-[11px] font-bold capitalize px-1.5 py-0.5 rounded-md flex items-center gap-1 w-full justify-center"
                              style={{
                                backgroundColor: `${token.color}28`,
                                color: token.color,
                                border: `1px solid ${token.color}55`,
                              }}
                            >
                              <span aria-hidden="true">{token.emoji}</span>
                              <span className="truncate">{res}</span>
                            </span>

                            <span className="text-xl font-black text-emerald-400 my-1">{amt}</span>
                            <span className="text-[10px] text-slate-500 mb-2 invisible">Spacer</span>

                            <div className="flex items-center gap-1 w-full justify-center">
                              <button
                                type="button"
                                onClick={() => updateWant(res, -1)}
                                aria-label={`Decrease ${res} to want`}
                                disabled={amt <= 0}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateWant(res, 1)}
                                aria-label={`Increase ${res} to want`}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-colors"
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
                    type="button"
                    onClick={handleSendOffer}
                    disabled={
                      !canOffer ||
                      Object.values(give).reduce((s, n) => s + (n || 0), 0) === 0 ||
                      Object.values(want).reduce((s, n) => s + (n || 0), 0) === 0
                    }
                    className="w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-30 disabled:pointer-events-none text-slate-950 shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Broadcast Offer to Players</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* TAB 2: BANK / MARITIME TRADE                              */}
          {/* ========================================================= */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              {/* Active Harbor Privileges Banner */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-slate-300">
                    Your Harbors:{' '}
                    {currentPlayer.portsOwned.length > 0 ? (
                      <span className="font-semibold text-emerald-300">
                        {currentPlayer.portsOwned
                          .map((p) => p.replace('_', ' ').toUpperCase())
                          .join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400">Standard (4:1 default)</span>
                    )}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Rate for <span className="capitalize font-bold text-amber-300">{bankGiveRes}</span>:{' '}
                  <span className="font-extrabold text-white text-xs">{currentBankRatio}:1</span>
                </div>
              </div>

              {/* Bank Give Row */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    1. Select Resource to Give
                  </span>
                  {bankGiveRes && (
                    <span className="text-[11px] text-slate-400">
                      Giving{' '}
                      <strong className="text-amber-400">
                        {currentBankRatio * bankTradeUnits} {bankGiveRes}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {RESOURCES.map((r) => {
                    const rRatio = getRatioForResource(r);
                    const has = currentPlayer.resources[r] || 0;
                    const isSelected = bankGiveRes === r;
                    const token = RESOURCE_TOKENS[r];
                    const canAffordAtLeastOne = has >= rRatio;

                    return (
                      <button
                        type="button"
                        key={`bank-give-${r}`}
                        onClick={() => {
                          setBankGiveRes(r);
                          setBankTradeUnits(1);
                        }}
                        className={`flex flex-col items-center p-2 rounded-xl border text-xs font-semibold capitalize transition-all relative ${
                          isSelected
                            ? 'ring-2 ring-amber-400 shadow-md'
                            : canAffordAtLeastOne
                            ? 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                            : 'border-slate-900 bg-slate-950/40 text-slate-500 opacity-45'
                        }`}
                        style={{
                          borderColor: isSelected ? token.color : undefined,
                          backgroundColor: isSelected ? `${token.color}25` : undefined,
                        }}
                      >
                        {/* Port ratio badge */}
                        <span
                          className={`absolute -top-2 px-1.5 py-0.2 rounded-full text-[9px] font-black border ${
                            rRatio === 2
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : rRatio === 3
                              ? 'bg-amber-600 text-white border-amber-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {rRatio}:1
                        </span>

                        <span className="text-base mt-1" aria-hidden="true">
                          {token.emoji}
                        </span>
                        <span className="mt-0.5 font-bold truncate w-full text-center">{r}</span>
                        <span className="text-[10px] text-slate-400 mt-1">Have: {has}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Multiple trade steppers for the selected resource */}
                {maxPossibleBankUnits > 1 && (
                  <div className="flex items-center justify-between p-2.5 mt-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                    <span className="text-slate-300">
                      Trade multiple? (You can afford up to {maxPossibleBankUnits} units):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBankTradeUnits((prev) => Math.max(1, prev - 1))}
                        disabled={bankTradeUnits <= 1}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white disabled:opacity-20 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-amber-400 text-sm px-1">
                        {bankTradeUnits}x
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setBankTradeUnits((prev) => Math.min(maxPossibleBankUnits, prev + 1))
                        }
                        disabled={bankTradeUnits >= maxPossibleBankUnits}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white disabled:opacity-20 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center justify-center gap-2 text-slate-500 py-0.5">
                <div className="h-px bg-slate-800 flex-1" />
                <ArrowDown className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  FOR
                </span>
                <ArrowDown className="w-4 h-4 text-slate-400" />
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              {/* Bank Receive Row */}
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                  2. Select Resource to Receive (+{bankTradeUnits})
                </span>

                <div className="grid grid-cols-5 gap-2">
                  {RESOURCES.map((r) => {
                    const isSelected = bankGetRes === r;
                    const isDisabled = bankGiveRes === r;
                    const token = RESOURCE_TOKENS[r];

                    return (
                      <button
                        type="button"
                        key={`bank-get-${r}`}
                        disabled={isDisabled}
                        onClick={() => setBankGetRes(r)}
                        className={`flex flex-col items-center p-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                          isDisabled
                            ? 'opacity-25 pointer-events-none border-slate-900 bg-slate-950 text-slate-600'
                            : isSelected
                            ? 'ring-2 ring-emerald-400 shadow-md text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                        }`}
                        style={{
                          borderColor: isSelected ? token.color : undefined,
                          backgroundColor: isSelected ? `${token.color}25` : undefined,
                        }}
                      >
                        <span className="text-base" aria-hidden="true">
                          {token.emoji}
                        </span>
                        <span className="mt-0.5 font-bold truncate w-full text-center">{r}</span>
                        <span className="text-[10px] text-emerald-400 font-bold mt-1">
                          +{bankTradeUnits}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Execute Bank Trade Button */}
              <button
                type="button"
                onClick={handleExecuteBankTrade}
                disabled={!bankCanAfford || !canTrade || !onExecuteBankTrade}
                className="w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 disabled:opacity-30 disabled:pointer-events-none text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Landmark className="w-4 h-4" />
                <span>
                  {bankCanAfford
                    ? `Exchange ${currentBankRatio * bankTradeUnits} ${bankGiveRes} for ${bankTradeUnits} ${bankGetRes}`
                    : `Need ${currentBankRatio * bankTradeUnits} ${bankGiveRes} (You have ${playerGiveCount})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

