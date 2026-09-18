'use client';

import React, { useState } from 'react';
import { User, LogIn, Sparkles, X, ShieldAlert } from 'lucide-react';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginAsGuest: (username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginAsGuest }) => {
  const [tab, setTab] = useState<'guest' | 'account'>('guest');
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasCloudSupabase = isSupabaseConfigured();

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    onLoginAsGuest(guestName.trim());
    onClose();
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasCloudSupabase) {
      setError('Supabase credentials are in template mode (.env.local). You can play instantly as a Guest!');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase client unavailable');

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (data.user) {
        onLoginAsGuest(data.user.email?.split('@')[0] || 'Player');
        onClose();
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Player Login</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 my-4 border border-slate-800">
          <button
            onClick={() => setTab('guest')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'guest' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Instant Guest Play
          </button>
          <button
            onClick={() => setTab('account')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'account' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔑 Supabase Account
          </button>
        </div>

        {/* Guest Tab */}
        {tab === 'guest' && (
          <form onSubmit={handleGuestSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-slate-400">
              Jump straight into games just like Colonist.io without creating an account.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Choose Display Name</label>
              <input
                type="text"
                placeholder="e.g. SettlerPro99"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={20}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-slate-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
            >
              Play as Guest
            </button>
          </form>
        )}

        {/* Account Tab */}
        {tab === 'account' && (
          <form onSubmit={handleAccountSubmit} className="flex flex-col gap-4">
            {!hasCloudSupabase && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Using template credentials in .env.local. Switch to <b>Instant Guest Play</b> or configure your Supabase URL & Key to sync cloud accounts.
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-slate-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-extrabold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In / Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
