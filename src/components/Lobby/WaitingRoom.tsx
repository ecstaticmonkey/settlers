'use client';

import React, { useState } from 'react';
import { Room, RoomPlayer } from '@/lib/multiplayer/room-service';
import { Crown, Bot, Check, Clock, Copy, CheckCheck, Users, Play, LogOut, Plus, Trash2 } from 'lucide-react';

interface WaitingRoomProps {
  room: Room;
  currentPlayerId: string;
  onAddBot: () => Promise<unknown>;
  onRemovePlayer: (playerId: string) => Promise<unknown>;
  onToggleReady: () => Promise<unknown>;
  onStartGame: () => Promise<unknown>;
  onLeaveRoom: () => Promise<unknown>;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  room,
  currentPlayerId,
  onAddBot,
  onRemovePlayer,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not update the room.'); }
    finally { setBusy(false); }
  };

  const me = room.players.find((p) => p.id === currentPlayerId);
  const isHost = me?.isHost || false;
  const canStart = room.players.length >= 2 && room.players.every((p) => p.isReady || p.isHost);

  const handleCopyCode = async () => {
    try {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    } catch { setError(`Copy this room code: ${room.code}`); }
  };

  // Generate slots up to maxPlayers
  const slots: (RoomPlayer | null)[] = [];
  for (let i = 0; i < room.maxPlayers; i++) {
    slots.push(room.players[i] || null);
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md text-white">
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <fieldset disabled={busy} className="contents">
      {/* Room Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">{room.name}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Waiting for Players
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {room.players.length} / {room.maxPlayers} Players • Turn Timer: {room.turnTimerSeconds}s
          </p>
        </div>

        {/* Room Code Badge */}
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all group"
          title="Click to copy Room Code"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Code:</span>
          <span className="text-base font-black text-amber-400 font-mono tracking-widest">{room.code}</span>
          {copied ? (
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
          )}
        </button>
      </div>

      {/* Players List */}
      <div className="py-6 flex flex-col gap-3">
        <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Lobby Roster</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slots.map((player, idx) => {
            if (player) {
              const isCurrentMe = player.id === currentPlayerId;

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    {/* Player Color Avatar */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.isBot ? (
                        <Bot className="w-5 h-5" />
                      ) : (
                        player.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100">
                        {player.name}
                        {player.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        {isCurrentMe && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">Color: {player.color}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Ready Badge */}
                    {player.isReady || player.isHost ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" /> Waiting
                      </span>
                    )}

                    {/* Host Kick Button */}
                    {isHost && !isCurrentMe && (
                      <button
                        onClick={() => void run(() => onRemovePlayer(player.id))}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // Empty Slot
            return (
              <div
                key={`empty-${idx}`}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">Slot {idx + 1} Empty</span>
                </div>

                {/* Host Add Bot button */}
                {isHost && (
                  <button
                    onClick={() => void run(onAddBot)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Bot
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lobby Controls Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-800">
        <button
          onClick={() => void run(onLeaveRoom)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Leave Room
        </button>

        <div className="flex items-center gap-2">
          {/* Ready Toggle for non-hosts */}
          {!isHost && me && (
            <button
              onClick={() => void run(onToggleReady)}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                me.isReady
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <Check className="w-4 h-4" />
              {me.isReady ? 'Ready!' : 'Ready Up'}
            </button>
          )}

          {/* Start Game for Host */}
          {isHost && (
            <button
              onClick={() => void run(onStartGame)}
              disabled={!canStart}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Start Game ({room.players.length}/{room.maxPlayers})
            </button>
          )}
        </div>
      </div>
      </fieldset>
    </div>
  );
};
