'use client';

import React, { useState } from 'react';
import { PlayerColor } from '@/lib/catan/types';
import { X, Plus, Shield, Clock, Users } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (options: {
    name: string;
    maxPlayers: number;
    turnTimerSeconds: number;
    isPrivate: boolean;
    passCode?: string;
    color: PlayerColor;
  }) => Promise<void>;
}

const COLORS: { value: PlayerColor; label: string; bg: string }[] = [
  { value: 'red', label: 'Red', bg: 'bg-red-600' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-600' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-600' },
  { value: 'white', label: 'White', bg: 'bg-slate-300' },
  { value: 'green', label: 'Green', bg: 'bg-emerald-600' },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
}) => {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState<number>(60);
  const [isPrivate, setIsPrivate] = useState(false);
  const [passCode, setPassCode] = useState('');
  const [color, setColor] = useState<PlayerColor>('red');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
    await onCreateRoom({
      name: name.trim() || 'Catan Match',
      maxPlayers,
      turnTimerSeconds,
      isPrivate,
      passCode: isPrivate ? passCode : undefined,
      color,
    });
    onClose();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not create the room.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Create Game Room</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-5 flex flex-col gap-4">
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <fieldset disabled={busy} className="contents">
          {/* Room Name */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Room Name</label>
            <input
              type="text"
              placeholder="e.g. Island Conquest"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-slate-600"
            />
          </div>

          {/* Max Players */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" /> Player Slots
            </label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxPlayers(n)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    maxPlayers === n
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {n} Players
                </button>
              ))}
            </div>
          </div>

          {/* Turn Timer */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Turn Timer
            </label>
            <div className="flex gap-2">
              {[30, 60, 90, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTurnTimerSeconds(sec)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    turnTimerSeconds === sec
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Your Color</label>
            <div className="flex gap-2.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${c.bg} ${
                    color === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Private Room Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-0"
              />
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-400" /> Private Room (Password Protected)
              </span>
            </label>

            {isPrivate && (
              <input
                type="password"
                required
                maxLength={128}
                placeholder="Set Passcode"
                value={passCode}
                onChange={(e) => setPassCode(e.target.value)}
                className="w-full mt-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 mt-2 rounded-xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
          >
            Create Room
          </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
};
