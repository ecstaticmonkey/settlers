'use client';

import React, { useEffect } from 'react';
import { Player } from '@/lib/catan/types';
import { Crown, Trophy, RotateCcw, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VictoryModalProps {
  winnerPlayerId: string | null;
  players: Player[];
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winnerPlayerId,
  players,
  onPlayAgain,
  onReturnToLobby,
}) => {
  if (!winnerPlayerId) return null;

  const winner = players.find((p) => p.id === winnerPlayerId);

  useEffect(() => {
    // Launch celebratory confetti burst
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg p-8 bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl text-white text-center flex flex-col items-center">
        {/* Victory Crown Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-lg animate-bounce">
          <Crown className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white mb-1">Victory!</h1>
        <p className="text-base text-slate-300 mb-6">
          <span className="font-extrabold text-amber-400">{winner?.name}</span> has conquered Catan with{' '}
          <span className="font-bold text-white">{winner?.secretVictoryPoints} Victory Points</span>!
        </p>

        {/* Score Table */}
        <div className="w-full bg-slate-950/80 rounded-2xl border border-slate-800 p-4 mb-6">
          <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">Final Standings</div>
          <div className="flex flex-col gap-2">
            {[...players]
              .sort((a, b) => b.secretVictoryPoints - a.secretVictoryPoints)
              .map((player, rank) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    player.id === winnerPlayerId
                      ? 'bg-amber-500/10 border-amber-500/40 text-white font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-500 w-4">#{rank + 1}</span>
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="text-sm">{player.name}</span>
                    {player.id === winnerPlayerId && (
                      <Trophy className="w-4 h-4 text-amber-400 inline" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-extrabold">{player.secretVictoryPoints}</span>
                    <span className="text-xs text-slate-400">pts</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onPlayAgain}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
          <button
            onClick={onReturnToLobby}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" /> Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
